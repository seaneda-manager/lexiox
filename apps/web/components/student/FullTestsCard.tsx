import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { sectionStartHref } from "@/lib/supabase/testAssignmentGroups";
import type { AssignableSection } from "@/lib/supabase/assignment-guard";

export default async function FullTestsCard() {
  try {
    const supabase = await getServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: groups } = await supabase
      .from("test_assignment_groups")
      .select("id, kind, status")
      .eq("student_id", user.id)
      .in("status", ["pending", "in_progress"])
      .order("created_at", { ascending: true });

    if (!groups || groups.length === 0) return null;

    const activeGroups = await Promise.all(
      groups.map(async (g) => {
        const { data: firstPending } = await supabase
          .from("test_assignments")
          .select("id, sections")
          .eq("group_id", g.id)
          .neq("status", "completed")
          .order("group_sequence", { ascending: true })
          .limit(1)
          .maybeSingle();
        return { ...g, firstPending };
      })
    );

    return (
      <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-slate-50 to-slate-25 px-4 py-3 border-b">
          <h3 className="text-sm font-semibold text-slate-900">🎯 Full / Half Test</h3>
          <p className="text-xs text-slate-500 mt-1">{activeGroups.length}개 진행 중</p>
        </div>
        <div className="divide-y">
          {activeGroups.map((g) => (
            <Link
              key={g.id}
              href={
                g.firstPending
                  ? sectionStartHref(g.firstPending.sections[0] as AssignableSection, g.firstPending.id)
                  : "/student/full-tests"
              }
              className="flex items-center justify-between gap-3 p-4 hover:bg-slate-50 transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {g.kind === "full" ? "Full Test" : "Half Test"}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {g.status === "pending" ? "아직 시작하지 않았습니다" : "이어서 진행하세요"}
                </p>
              </div>
              <span className="shrink-0 rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white">
                {g.status === "pending" ? "시작 →" : "이어서 →"}
              </span>
            </Link>
          ))}
        </div>
      </div>
    );
  } catch {
    return null;
  }
}
