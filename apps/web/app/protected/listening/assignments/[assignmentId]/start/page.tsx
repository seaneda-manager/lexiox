import { notFound, redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import ListeningSessionContainer from "../../../_components/ListeningSessionContainer";
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

  // listening_tests의 RLS는 status='locked'인 행만 학생에게 노출하는데,
  // 지금 admin 동기화는 status='active'로 저장한다. 여기서는 이미 위에서
  // test_assignments RLS로 이 학생이 이 배정의 소유자임을 확인했으므로
  // service client로 우회해서 읽는다.
  const service = getServiceSupabase();
  const { data: testRow } = await service
    .from("listening_tests")
    .select("id, label, content")
    .eq("id", assignment.listening_test_id)
    .maybeSingle();

  if (!testRow || !testRow.content) notFound();

  await markInProgress(assignmentId, assignment.status);

  return (
    <ListeningSessionContainer
      testData={testRow.content as LListeningTest2026Linear}
      testId={testRow.id}
      assignmentId={assignmentId}
    />
  );
}
