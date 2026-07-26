import { notFound, redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import MockTestPlayer from "@/components/reading/MockTestPlayer";
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
    .select("id, status, sections, reading_test_id")
    .eq("id", assignmentId)
    .eq("student_id", user.id)
    .maybeSingle();

  if (!assignment || !assignment.reading_test_id) notFound();

  // reading_tests RLS는 status='active'인 행만 노출할 수 있어 service client로 통일한다
  // (소유권은 이미 위에서 assignment.student_id === user.id로 확인했다).
  const service = getServiceSupabase();
  const { data: testRow } = await service
    .from("reading_tests")
    .select("id, label, payload")
    .eq("id", assignment.reading_test_id)
    .maybeSingle();

  if (!testRow || !testRow.payload) notFound();

  await markInProgress(assignmentId, assignment.status);

  return (
    <MockTestPlayer
      testId={testRow.id}
      label={testRow.label ?? "Reading Test"}
      test={testRow.payload as RReadingTest2026}
      assignmentId={assignmentId}
    />
  );
}
