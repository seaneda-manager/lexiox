import { notFound } from "next/navigation";
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

type Params = Promise<{ groupId: string }>;

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  pending: { text: "대기", cls: "bg-slate-100 text-slate-600" },
  in_progress: { text: "진행중", cls: "bg-amber-100 text-amber-700" },
  completed: { text: "완료", cls: "bg-emerald-100 text-emerald-700" },
};

export default async function FullTestGroupSummaryPage({ params }: { params: Params }) {
  const { groupId } = await params;
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: group } = await supabase
    .from("test_assignment_groups")
    .select("id, kind, status, due_date, started_at, completed_at")
    .eq("id", groupId)
    .eq("student_id", user.id)
    .maybeSingle();

  if (!group) notFound();

  const { data: assignments } = await supabase
    .from("test_assignments")
    .select("id, group_sequence, sections, status, completed_at")
    .eq("group_id", groupId)
    .order("group_sequence", { ascending: true });

  const bySequence = new Map((assignments ?? []).map((a) => [a.group_sequence, a]));

  return (
    <main className="mx-auto max-w-2xl space-y-5 px-4 py-6">
      <Link
        href="/student/full-tests"
        className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-600"
      >
        ← 목록으로
      </Link>

      <header className="space-y-1">
        <h1 className="text-xl font-bold text-slate-900">
          {(group.kind as AssignmentGroupKind) === "full" ? "Full Test" : "Half Test"} 결과
        </h1>
        <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_LABEL[group.status]?.cls ?? STATUS_LABEL.pending.cls}`}>
          {STATUS_LABEL[group.status]?.text ?? "대기"}
        </span>
      </header>

      <div className="space-y-3">
        {TOEFL_SECTION_ORDER.map((section, idx) => {
          const row = bySequence.get(idx + 1);
          const statusInfo = row ? STATUS_LABEL[row.status] ?? STATUS_LABEL.pending : STATUS_LABEL.pending;

          return (
            <div key={section} className="flex items-center justify-between rounded-xl border bg-white px-4 py-4 shadow-sm">
              <div>
                <p className="text-sm font-semibold text-slate-900">{SECTION_LABEL[section as AssignableSection]}</p>
                <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${statusInfo.cls}`}>
                  {statusInfo.text}
                </span>
              </div>
              {row && (
                <Link
                  href={sectionStartHref(section as AssignableSection, row.id)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {row.status === "completed" ? "결과 보기" : "이어서 하기"} →
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
