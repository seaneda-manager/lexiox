import { notFound, redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import ReadingTestRunnerClient from "@/app/protected/updated-reading/test/[testId]/_client/ReadingTestRunnerClient";
import type { RReadingTest2026 } from "@/models/reading";

export const dynamic = "force-dynamic";

type Params = Promise<{ assignmentId: string }>;

async function markInProgress(assignmentId: string, currentStatus: string) {
  if (currentStatus !== "pending") return;
  const service = getServiceSupabase();
  await service
    .from("test_assignments")
    .update({ status: "in_progress", started_at: new Date().toISOString() })
    .eq("id", assignmentId);
}

export default async function StartReadingAssignmentPage({ params }: { params: Params }) {
  const { assignmentId } = await params;
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: assignment } = await supabase
    .from("test_assignments")
    .select("id, status, reading_test_id")
    .eq("id", assignmentId)
    .eq("student_id", user.id)
    .maybeSingle();

  if (!assignment || !assignment.reading_test_id) notFound();

  // test_assignments.reading_test_id의 FK는 reading_tests(레거시)를 향한다 — admin assign
  // 화면이 배정 직전에 reading_tests_2026 → reading_tests로 동기화해서 넣어주기 때문에 FK가
  // 항상 만족되지만, reading_tests_2026 쪽 행은 그 이후 삭제/재생성됐을 수 있어 보장되지 않는다.
  // 최신 콘텐츠가 있으면 reading_tests_2026을 우선 쓰고, 없으면 FK가 보장하는 reading_tests로 폴백한다.
  const { data: freshTestRow } = await supabase
    .from("reading_tests_2026")
    .select("id, label, payload")
    .eq("id", assignment.reading_test_id)
    .maybeSingle();

  // reading_tests RLS는 status='active'인 행만 노출할 수 있어 service client로 통일한다.
  const testRow =
    freshTestRow ??
    (
      await getServiceSupabase()
        .from("reading_tests")
        .select("id, label, payload")
        .eq("id", assignment.reading_test_id)
        .maybeSingle()
    ).data;

  if (!testRow || !testRow.payload) notFound();

  await markInProgress(assignmentId, assignment.status);

  return (
    <ReadingTestRunnerClient
      testId={testRow.id}
      label={testRow.label ?? "Reading Test"}
      test={testRow.payload as RReadingTest2026}
      assignmentId={assignmentId}
    />
  );
}
