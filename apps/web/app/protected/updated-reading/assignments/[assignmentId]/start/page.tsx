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

  // reading_tests_2026이 실제 콘텐츠 원본이다 (admin assign 화면에서 배정 직전에
  // reading_tests_2026 → reading_tests(레거시, FK 전용)로 동기화하지만, id는 동일하다).
  const { data: testRow } = await supabase
    .from("reading_tests_2026")
    .select("id, label, payload")
    .eq("id", assignment.reading_test_id)
    .maybeSingle();

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
