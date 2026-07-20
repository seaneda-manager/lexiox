import { notFound, redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import type { SpeakingTest2026, SpeakingTaskListenRepeat2026, SpeakingTaskInterview2026 } from "@/models/speaking-2026";
import SpeakingAssignmentRunner from "./_client/SpeakingAssignmentRunner";

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

export default async function StartAssignmentPage({ params }: { params: Params }) {
  const { assignmentId } = await params;
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Load assignment
  const { data: assignment } = await supabase
    .from("test_assignments")
    .select("id, status, sections, speaking_test_id")
    .eq("id", assignmentId)
    .eq("student_id", user.id)
    .maybeSingle();

  if (!assignment) notFound();
  if (assignment.status === "completed") {
    redirect(`/speaking-2026/assignments?done=${assignmentId}`);
  }

  // Load speaking test payload
  const { data: testRow } = await supabase
    .from("speaking_tests")
    .select("id, label, payload")
    .eq("id", assignment.speaking_test_id)
    .maybeSingle();

  if (!testRow) notFound();

  // Mark in_progress if first visit
  await markInProgress(assignmentId, assignment.status);

  const test = testRow.payload as SpeakingTest2026;

  return (
    <SpeakingAssignmentRunner
      assignmentId={assignmentId}
      test={test}
      testLabel={testRow.label}
    />
  );
}
