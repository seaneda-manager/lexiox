// 학생 한 명의 배정 과제 상세: 밀린 것(기한초과 → 진행중/대기)을 위에, 끝낸 것은 접어서 아래에.
import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { getStudentAssignmentCalendar } from "@/lib/assignments/studentAssignmentCalendar";
import {
  ASSIGNMENT_AREA_LABEL,
  ASSIGNMENT_AREA_ORDER,
  ASSIGNMENT_KIND_LABEL,
  ASSIGNMENT_PROGRAM_LABEL,
  programOfKind,
  ASSIGNMENT_STATUS_LABEL,
  type AssignmentItem,
  type AssignmentStatus,
} from "@/lib/assignments/types";
import { getWeekRange, parseWeek, weekLabel, WEEK_LINKS } from "@/lib/assignments/weeks";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DONE = new Set<AssignmentStatus>(["completed", "graded", "submitted"]);
const URGENCY: Record<string, number> = { overdue: 0, in_progress: 1, pending: 2 };
const BASIS_LABEL: Record<string, string> = { due: "기한", assigned: "배정", available: "오픈", completed: "완료", exam: "시험" };

const STATUS_STYLE: Record<string, string> = {
  overdue: "bg-rose-100 text-rose-700",
  in_progress: "bg-amber-100 text-amber-700",
  pending: "bg-neutral-100 text-neutral-600",
  submitted: "bg-sky-100 text-sky-700",
  completed: "bg-emerald-100 text-emerald-700",
  graded: "bg-emerald-100 text-emerald-700",
};

export default async function StudentAssignmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ week?: string }>;
}) {
  const { studentId } = await params;
  const weeksAgo = parseWeek((await searchParams).week);
  const range = getWeekRange(weeksAgo);

  const supabase = await getServerSupabase();
  const { data: stu } = await supabase
    .from("academy_students")
    .select("id, display_name, school, grade, user_id, auth_user_id")
    .eq("id", studentId)
    .maybeSingle();
  if (!stu) return <div className="p-8 text-red-600">학생을 찾을 수 없습니다.</div>;

  const authUserId = ((stu as any).user_id ?? (stu as any).auth_user_id ?? stu.id) as string;
  const items: AssignmentItem[] = await getStudentAssignmentCalendar({
    authUserId,
    academyStudentId: stu.id as string,
    fromIso: range.from,
    toIso: range.to,
    carryOver: true,
  }).catch(() => []);

  const open = items
    .filter((it) => !DONE.has(it.status))
    .sort((a, b) => (URGENCY[a.status] ?? 3) - (URGENCY[b.status] ?? 3) || (a.date < b.date ? -1 : 1));
  const done = items.filter((it) => DONE.has(it.status)).sort((a, b) => (a.date < b.date ? 1 : -1));

  const areas = ASSIGNMENT_AREA_ORDER.map((a) => {
    const list = items.filter((it) => (it.area ?? "other") === a);
    return { area: a, total: list.length, done: list.filter((it) => DONE.has(it.status)).length, overdue: list.filter((it) => it.status === "overdue").length };
  }).filter((a) => a.total > 0);

  return (
    <main className="mx-auto max-w-4xl space-y-4 px-4 py-6">
      <header className="space-y-1">
        <Link href={`/teacher/reports/assignments?week=${weeksAgo}`} className="text-xs text-sky-600 hover:underline">
          ← 배정 과제 현황
        </Link>
        <h1 className="text-xl font-bold text-gray-900">{(stu as any).display_name ?? "이름 미등록"}</h1>
        <p className="text-xs text-gray-500">
          {(stu as any).school ?? "-"} · {(stu as any).grade ?? "-"} · {range.label}
        </p>
      </header>

      <div className="flex gap-1">
        {WEEK_LINKS.map((w) => (
          <Link
            key={w}
            href={`/teacher/reports/assignments/${studentId}?week=${w}`}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              weeksAgo === w ? "bg-neutral-800 text-white" : "border border-neutral-200 text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            {weekLabel(w)}
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {areas.length === 0 && <span className="text-sm text-gray-400">이 기간에 배정된 과제가 없습니다.</span>}
        {areas.map((a) => (
          <div key={a.area} className={`rounded-xl border bg-white px-3 py-2 ${a.overdue > 0 ? "border-rose-200" : ""}`}>
            <div className="text-[10px] uppercase tracking-wide text-gray-400">{ASSIGNMENT_AREA_LABEL[a.area]}</div>
            <div className="text-sm font-bold text-gray-900">
              {a.done}/{a.total}
              {a.overdue > 0 && <span className="ml-1.5 text-xs text-rose-600">기한초과 {a.overdue}</span>}
            </div>
          </div>
        ))}
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-800">해야 할 과제 ({open.length})</h2>
        {open.length === 0 && <p className="rounded-xl border bg-white p-4 text-sm text-emerald-700">밀린 과제가 없습니다. 🎉</p>}
        <ItemList items={open} />
      </section>

      {done.length > 0 && (
        <details className="rounded-xl border bg-white p-3">
          <summary className="cursor-pointer text-sm font-semibold text-gray-700">완료한 과제 ({done.length})</summary>
          <div className="mt-2">
            <ItemList items={done} />
          </div>
        </details>
      )}
    </main>
  );
}

function ItemList({ items }: { items: AssignmentItem[] }) {
  return (
    <ul className="divide-y rounded-xl border bg-white">
      {items.map((it) => {
        const body = (
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                <span className="rounded bg-gray-100 px-1.5 py-0.5 font-semibold text-gray-600">
                  {ASSIGNMENT_AREA_LABEL[it.area ?? "other"]}
                </span>
                {ASSIGNMENT_KIND_LABEL[it.kind]}
                <span className="text-gray-300">·</span>
                {programOfKind(it.kind) ? ASSIGNMENT_PROGRAM_LABEL[programOfKind(it.kind)!] : "공통"}
              </div>
              <div className="truncate text-sm font-medium text-gray-900">{it.title}</div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-400">
                {BASIS_LABEL[it.dateBasis] ?? ""} {it.date.slice(5).replace("-", "/")}
              </span>
              {typeof it.scorePct === "number" && <span className="font-semibold text-gray-700">{it.scorePct}%</span>}
              <span className={`rounded px-1.5 py-0.5 font-semibold ${STATUS_STYLE[it.status] ?? "bg-neutral-100 text-neutral-600"}`}>
                {ASSIGNMENT_STATUS_LABEL[it.status]}
              </span>
            </div>
          </div>
        );
        return (
          <li key={`${it.kind}:${it.id}`} className="hover:bg-gray-50">
            {it.href ? <Link href={it.href}>{body}</Link> : body}
          </li>
        );
      })}
    </ul>
  );
}
