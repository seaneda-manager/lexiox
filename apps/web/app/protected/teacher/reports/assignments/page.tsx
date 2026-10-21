// apps/web/app/protected/teacher/reports/assignments/page.tsx
// 반 전체 학생 x 과제 현황 매트릭스. studentAssignmentCalendar.ts 가 숙제/시험/단어/JR/Hi-내신/중학내신을
// 하나의 형태(AssignmentItem)로 합쳐 주고, 여기서는 영역별(Reading/Grammar/Voca…) 또는 종류별로 집계한다.

import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { getStudentAssignmentCalendar } from "@/lib/assignments/studentAssignmentCalendar";
import {
  ASSIGNMENT_KIND_LABEL,
  ASSIGNMENT_AREA_LABEL,
  ASSIGNMENT_AREA_ORDER,
  ASSIGNMENT_PROGRAM_LABEL,
  ASSIGNMENT_PROGRAM_ORDER,
  programOfKind,
  type AssignmentKind,
  type AssignmentArea,
  type AssignmentItem,
  type AssignmentProgram,
} from "@/lib/assignments/types";
import { getWeekRange, parseWeek, weekLabel, WEEK_LINKS } from "@/lib/assignments/weeks";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const KIND_ORDER: AssignmentKind[] = [
  "daily_test",
  "toefl_section",
  "toefl_group",
  "hi_naesin",
  "middle_naesin",
  "middle_general",
  "jr",
  "homework",
  "vocab",
];

const DONE_STATUSES = new Set(["completed", "graded", "submitted"]);

type Bucket = { total: number; done: number; overdue: number };
const empty = (): Bucket => ({ total: 0, done: 0, overdue: 0 });

type Props = {
  searchParams: Promise<{ week?: string; by?: string; program?: string }>;
};

export default async function AssignmentsOverviewPage({ searchParams }: Props) {
  const { week, by: byParam, program: programParam } = await searchParams;
  const weeksAgo = parseWeek(week);
  const by: "area" | "kind" = byParam === "kind" ? "kind" : "area";
  // 프로그램 탭: 선택한 프로그램의 과제(+ 공통 과제)와 그 프로그램을 하는 학생만 보여준다.
  const program: AssignmentProgram | "all" = (ASSIGNMENT_PROGRAM_ORDER as string[]).includes(programParam ?? "")
    ? (programParam as AssignmentProgram)
    : "all";
  const range = getWeekRange(weeksAgo);

  const supabase = await getServerSupabase();
  const { data: roster } = await supabase
    .from("academy_students")
    .select("id, display_name, school, grade, user_id, auth_user_id")
    .eq("is_active", true)
    .order("display_name", { ascending: true });

  const students = roster ?? [];

  const rows = await Promise.all(
    students.map(async (s: any) => {
      const authUserId = (s.user_id ?? s.auth_user_id ?? s.id) as string;
      const allItems: AssignmentItem[] = await getStudentAssignmentCalendar({
        authUserId,
        academyStudentId: s.id,
        fromIso: range.from,
        toIso: range.to,
        carryOver: true,
      }).catch(() => []);

      const programs = new Set<AssignmentProgram>();
      for (const it of allItems) {
        const p = programOfKind(it.kind);
        if (p) programs.add(p);
      }
      const items =
        program === "all"
          ? allItems
          : allItems.filter((it) => {
              const p = programOfKind(it.kind);
              return p === null || p === program;
            });

      const byKind: Record<string, Bucket> = {};
      const byArea: Record<string, Bucket> = {};
      const total: Bucket = empty();
      for (const it of items) {
        const done = DONE_STATUSES.has(it.status);
        const over = it.status === "overdue";
        for (const [map, key] of [
          [byKind, it.kind],
          [byArea, it.area ?? "other"],
        ] as const) {
          const b = (map[key] ??= empty());
          b.total += 1;
          if (done) b.done += 1;
          if (over) b.overdue += 1;
        }
        total.total += 1;
        if (done) total.done += 1;
        if (over) total.overdue += 1;
      }

      return {
        id: s.id as string,
        authUserId,
        name: (s.display_name as string | null) ?? "이름 미등록",
        school: (s.school as string | null) ?? "-",
        grade: (s.grade as string | null) ?? "-",
        byKind,
        byArea,
        programs,
        total,
        overallPct: total.total > 0 ? Math.round((total.done / total.total) * 100) : null,
      };
    }),
  );

  // 기한초과가 많은 학생 → 완료율 낮은 학생 순 (먼저 확인이 필요한 학생이 위로)
  // 프로그램 탭에서는 그 프로그램을 하는 학생만 남긴다 (공통 과제만 있는 학생은 제외)
  const programCounts = Object.fromEntries(
    ASSIGNMENT_PROGRAM_ORDER.map((p) => [p, rows.filter((r) => r.programs.has(p)).length]),
  ) as Record<AssignmentProgram, number>;
  const shown = program === "all" ? rows : rows.filter((r) => r.programs.has(program));

  shown.sort((a, b) => b.total.overdue - a.total.overdue || (a.overallPct ?? 101) - (b.overallPct ?? 101));

  // 아무 학생에게도 항목이 없는 열은 숨긴다
  const columns: { key: string; label: string }[] =
    by === "area"
      ? ASSIGNMENT_AREA_ORDER.filter((a) => shown.some((r) => (r.byArea[a]?.total ?? 0) > 0)).map((a) => ({
          key: a,
          label: ASSIGNMENT_AREA_LABEL[a as AssignmentArea],
        }))
      : KIND_ORDER.filter((k) => shown.some((r) => (r.byKind[k]?.total ?? 0) > 0)).map((k) => ({
          key: k,
          label: ASSIGNMENT_KIND_LABEL[k],
        }));

  const totalAll = shown.reduce((s, r) => s + r.total.total, 0);
  const doneAll = shown.reduce((s, r) => s + r.total.done, 0);
  const overdueAll = shown.reduce((s, r) => s + r.total.overdue, 0);
  const overdueStudents = shown.filter((r) => r.total.overdue > 0).length;

  const href = (w: number, b: string, p: string = program) => `/teacher/reports/assignments?week=${w}&by=${b}&program=${p}`;
  const chip = (active: boolean) =>
    `rounded-lg px-2.5 py-1 text-xs font-medium transition ${
      active ? "bg-neutral-800 text-white" : "border border-neutral-200 text-neutral-600 hover:bg-neutral-100"
    }`;

  return (
    <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <header className="space-y-1">
        <h1 className="text-xl font-bold text-gray-900">배정 과제 현황</h1>
        <p className="text-xs text-gray-500">학생별 · {by === "area" ? "영역별(Reading/Grammar/Voca…)" : "과제 종류별"} 완료 현황 ({range.label})</p>
      </header>

      <div className="flex flex-wrap gap-1">
        <Link href={href(weeksAgo, by, "all")} className={chip(program === "all")}>
          전체 {rows.length}
        </Link>
        {ASSIGNMENT_PROGRAM_ORDER.map((p) => (
          <Link key={p} href={href(weeksAgo, by, p)} className={chip(program === p)}>
            {ASSIGNMENT_PROGRAM_LABEL[p]} {programCounts[p]}
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1">
          {WEEK_LINKS.map((w) => (
            <Link key={w} href={href(w, by)} className={chip(weeksAgo === w)}>
              {weekLabel(w)}
            </Link>
          ))}
        </div>
        <div className="flex gap-1">
          <Link href={href(weeksAgo, "area")} className={chip(by === "area")}>
            영역별
          </Link>
          <Link href={href(weeksAgo, "kind")} className={chip(by === "kind")}>
            종류별
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="학생" value={`${shown.length}명`} />
        <Stat label="배정 과제" value={`${totalAll}건`} />
        <Stat label="완료율" value={totalAll > 0 ? `${Math.round((doneAll / totalAll) * 100)}%` : "—"} />
        <Stat label="기한초과" value={`${overdueAll}건 · ${overdueStudents}명`} tone={overdueAll > 0 ? "bad" : "ok"} />
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full text-xs">
          <thead className="border-b bg-gray-50 text-[11px] text-gray-500">
            <tr>
              <th className="px-3 py-2 text-left">학생</th>
              <th className="px-2 py-2 text-left">프로그램</th>
              {columns.map((c) => (
                <th key={c.key} className="px-2 py-2 text-center">
                  {c.label}
                </th>
              ))}
              <th className="px-2 py-2 text-center">기한초과</th>
              <th className="px-3 py-2 text-center">전체</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {shown.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 4} className="px-3 py-6 text-center text-gray-400">
                  학생이 없습니다.
                </td>
              </tr>
            ) : (
              shown.map((r) => (
                <tr key={r.id} className="hover:bg-emerald-50/30">
                  <td className="px-3 py-2">
                    <Link href={`/teacher/reports/assignments/${r.id}?week=${weeksAgo}`} className="font-medium text-gray-900 hover:underline">
                      {r.name}
                    </Link>
                    <div className="text-[10px] text-gray-400">
                      {r.school} · {r.grade} ·{" "}
                      <Link href={`/teacher/students/${r.authUserId}`} className="hover:underline">
                        프로필
                      </Link>
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex flex-wrap gap-1">
                      {ASSIGNMENT_PROGRAM_ORDER.filter((p) => r.programs.has(p)).map((p) => (
                        <span key={p} className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                          {ASSIGNMENT_PROGRAM_LABEL[p]}
                        </span>
                      ))}
                    </div>
                  </td>
                  {columns.map((c) => {
                    const b = (by === "area" ? r.byArea : r.byKind)[c.key];
                    const has = !!b && b.total > 0;
                    const pct = has ? Math.round((b.done / b.total) * 100) : null;
                    return (
                      <td key={c.key} className="px-2 py-2 text-center">
                        {has ? (
                          <span
                            className={`inline-block rounded px-1.5 py-0.5 font-semibold ${
                              pct === 100
                                ? "bg-emerald-50 text-emerald-700"
                                : b.overdue > 0
                                  ? "bg-rose-50 text-rose-700"
                                  : pct! > 0
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-neutral-100 text-neutral-600"
                            }`}
                          >
                            {b.done}/{b.total}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-2 py-2 text-center">
                    {r.total.overdue > 0 ? (
                      <span className="rounded bg-rose-100 px-1.5 py-0.5 font-bold text-rose-700">{r.total.overdue}</span>
                    ) : (
                      <span className="text-gray-300">0</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {r.overallPct !== null ? (
                      <span
                        className={`font-bold ${
                          r.overallPct >= 80 ? "text-emerald-600" : r.overallPct >= 40 ? "text-amber-600" : "text-rose-600"
                        }`}
                      >
                        {r.overallPct}%
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-gray-500">
        완료 기준: 완료/채점완료/제출 상태. 기한초과가 많은 학생이 위로 옵니다. 프로그램 탭에서는 그 프로그램 과제와 공통 과제(숙제 채점·단어)만 보입니다. 중학일반은 Hi-내신 시스템의 중학 학년(M1~M3) 지문 배정입니다. 중학내신은 기한이 지난 미완료 과제와 최근 60일 안에 배정된 미완료 과제도 함께 보여줍니다. 학생 이름을 누르면 밀린 숙제 목록이 열립니다.
      </p>
    </main>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "ok" | "bad" }) {
  return (
    <div className={`rounded-xl border bg-white px-3 py-2 ${tone === "bad" ? "border-rose-200" : ""}`}>
      <div className="text-[10px] uppercase tracking-wide text-gray-400">{label}</div>
      <div className={`text-base font-bold ${tone === "bad" ? "text-rose-600" : "text-gray-900"}`}>{value}</div>
    </div>
  );
}
