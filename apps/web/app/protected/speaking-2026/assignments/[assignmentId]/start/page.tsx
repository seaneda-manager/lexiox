import { notFound, redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import type { SpeakingTest2026, SpeakingTaskListenRepeat2026, SpeakingTaskInterview2026 } from "@/models/speaking-2026";
import SpeakingAssignmentRunner from "./_client/SpeakingAssignmentRunner";
import SpeakingAssignmentResults from "./_client/SpeakingAssignmentResults";

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
    .select("id, status, sections, speaking_test_id, results_payload, speaking_round_id")
    .eq("id", assignmentId)
    .eq("student_id", user.id)
    .maybeSingle();

  if (!assignment) notFound();

  // If completed, show results page
  if (assignment.status === "completed") {
    return (
      <SpeakingAssignmentResults
        assignmentId={assignmentId}
        results={assignment.results_payload}
      />
    );
  }

  // Load or generate speaking test payload
  let test: SpeakingTest2026;
  let testLabel: string;

  // If round_id is provided, load test from the round
  if (assignment.speaking_round_id) {
    const { data: round } = await supabase
      .from("speaking_rounds")
      .select("round_number, speaking_test_id")
      .eq("id", assignment.speaking_round_id)
      .maybeSingle();

    if (!round) notFound();

    const { data: testRow } = await supabase
      .from("speaking_tests")
      .select("id, label, payload")
      .eq("id", round.speaking_test_id)
      .maybeSingle();

    if (!testRow) notFound();

    test = testRow.payload as SpeakingTest2026;
    testLabel = `${testRow.label} (Round ${round.round_number})`;
  } else {
    // Load from speaking_tests table (legacy)
    const { data: testRow } = await supabase
      .from("speaking_tests")
      .select("id, label, payload")
      .eq("id", assignment.speaking_test_id)
      .maybeSingle();

    if (!testRow) notFound();

    test = testRow.payload as SpeakingTest2026;
    testLabel = testRow.label;
  }

  // Mark in_progress if first visit
  await markInProgress(assignmentId, assignment.status);

  return (
    <SpeakingAssignmentRunner
      assignmentId={assignmentId}
      test={test}
      testLabel={testLabel}
    />
  );
}
