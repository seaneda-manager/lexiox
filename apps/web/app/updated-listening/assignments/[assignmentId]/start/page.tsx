import { notFound, redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import ListeningTestWrapper from "./_client";
import type { LListeningTest2026Linear } from "@/models/listening";

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

export default async function StartListeningAssignmentPage({ params }: { params: Params }) {
  const { assignmentId } = await params;
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: assignment } = await supabase
    .from("test_assignments")
    .select("id, status, sections, listening_test_id")
    .eq("id", assignmentId)
    .eq("student_id", user.id)
    .maybeSingle();

  if (!assignment || !assignment.listening_test_id) notFound();

  const service = getServiceSupabase();
  const { data: testRow } = await service
    .from("listening_tests")
    .select("id, label, payload")
    .eq("id", assignment.listening_test_id)
    .maybeSingle();

  if (!testRow || !testRow.payload) notFound();

  await markInProgress(assignmentId, assignment.status);

  return (
    <ListeningTestWrapper
      testId={testRow.id}
      testData={testRow.payload as LListeningTest2026Linear}
      assignmentId={assignmentId}
    />
  );
}
