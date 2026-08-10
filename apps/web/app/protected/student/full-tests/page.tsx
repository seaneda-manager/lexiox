import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import {
  SECTION_LABEL,
  TOEFL_SECTION_ORDER,
  sectionStartHref,
  type AssignmentGroupKind,
} from "@/lib/supabase/testAssignmentGroups";
import type { AssignableSection } from "@/lib/supabase/assignment-guard";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  pending: { text: "대기", cls: "bg-slate-100 text-slate-600" },
  in_progress: { text: "진행중", cls: "bg-amber-100 text-amber-700" },
  completed: { text: "완료", cls: "bg-emerald-100 text-emerald-700" },
};

function fmtDate(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

type GroupRow = {
  id: string;
  kind: AssignmentGroupKind;
  status: string;
  due_date: string | null;
  assigned_at: string | null;
  created_at: string | null;
};

type AssignmentRow = {
  id: string;
  group_id: string;
  group_sequence: number;
  sections: string[];
  status: string;
};

export default async function StudentFullTestsPage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: groups } = await supabase
    .from("test_assignment_groups")
    .select("id, kind, status, due_date, created_at")
    .eq("student_id", user.id)
    .order("created_at", { ascending: false });

  const groupList = (groups ?? []) as GroupRow[];
  const groupIds = groupList.map((g) => g.id);

  const { data: assignments } =
    groupIds.length > 0
      ? await supabase
          .from("test_assignments")
          .select("id, group_id, group_sequence, sections, status")
          .in("group_id", groupIds)
          .order("group_sequence", { ascending: true })
      : { data: [] as AssignmentRow[] };

  const assignmentsByGroup = new Map<string, AssignmentRow[]>();
  for (const a of (assignments ?? []) as AssignmentRow[]) {
    const list = assignmentsByGroup.get(a.group_id) ?? [];
    list.push(a);
    assignmentsByGroup.set(a.group_id, list);
  }

  return (
    <main className="mx-auto max-w-2xl space-y-5 px-4 py-6">
      <Link
        href="/student"
        className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-600"
      >
        ← 홈으로
      </Link>
      <header className="space-y-1">
        <h1 className="text-xl font-bold text-slate-900">Full / Half Test</h1>
        <p className="text-xs text-slate-400">
          Reading → Listening → Speaking → Writing 순서로 이어서 치르는 통합 시험입니다.
        </p>
      </header>

      {groupList.length === 0 ? (
        <div className="rounded-xl border bg-white px-6 py-10 text-center text-sm text-slate-400">
          배정된 통합 시험이 없습니다.
        </div>
      ) : (
        <div className="space-y-4">
          {groupList.map((g) => {
            const sections = assignmentsByGroup.get(g.id) ?? [];
            const bySequence = new Map(sections.map((s) => [s.group_sequence, s]));
            const statusInfo = STATUS_LABEL[g.status] ?? STATUS_LABEL.pending;
            const firstPending = sections.find((s) => s.status !== "completed");

            return (
              <div key={g.id} className="rounded-xl border bg-white px-4 py-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {g.kind === "full" ? "Full Test" : "Half Test"}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span className={`rounded-full px-2 py-0.5 font-medium ${statusInfo.cls}`}>
                        {statusInfo.text}
                      </span>
                      {g.due_date && <span>마감 {fmtDate(g.due_date)}</span>}
                    </div>
                  </div>
                </div>

                <div className="mb-3 flex flex-wrap gap-2">
                  {TOEFL_SECTION_ORDER.map((section, idx) => {
                    const row = bySequence.get(idx + 1);
                    const sInfo = row ? STATUS_LABEL[row.status] ?? STATUS_LABEL.pending : STATUS_LABEL.pending;
                    return (
                      <span
                        key={section}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${sInfo.cls}`}
                      >
                        {SECTION_LABEL[section as AssignableSection]}
                      </span>
                    );
                  })}
                </div>

                {g.status === "completed" ? (
                  <Link
                    href={`/student/full-tests/${g.id}`}
                    className="block rounded-lg bg-slate-900 px-4 py-2 text-center text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    전체 결과 보기
                  </Link>
                ) : firstPending ? (
                  <Link
                    href={sectionStartHref(
                      firstPending.sections[0] as AssignableSection,
                      firstPending.id
                    )}
                    className="block rounded-lg bg-sky-500 px-4 py-2 text-center text-xs font-semibold text-white hover:bg-sky-600"
                  >
                    {g.status === "pending" ? "시작하기" : "이어서 하기"} →
                  </Link>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
