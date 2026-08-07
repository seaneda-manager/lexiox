import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import ListeningSessionContainer from "@/app/protected/listening/_components/ListeningSessionContainer";
import type { LListeningTest2026Linear } from "@/models/listening";

export const dynamic = "force-dynamic";

async function markInProgress(assignmentId: string, currentStatus: string) {
  if (currentStatus !== "pending") return;
  const service = getServiceSupabase();
  await service
    .from("test_assignments")
    .update({ status: "in_progress", started_at: new Date().toISOString() })
    .eq("id", assignmentId);
}

export default async function ListeningStartPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { assignmentId } = await params;
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // 학생의 할당을 조회
  const { data: assignment } = await supabase
    .from("test_assignments")
    .select("id, status, listening_test_id")
    .eq("id", assignmentId)
    .eq("student_id", user.id)
    .maybeSingle();

  if (!assignment || !assignment.listening_test_id) {
    return (
      <div className="p-4 text-center text-red-600">
        시험을 찾을 수 없습니다.
      </div>
    );
  }

  // listening_tests_2026 RLS는 status='active'인 행만 노출할 수 있어 service client로 통일한다
  // (소유권은 이미 위에서 assignment.student_id === user.id로 확인했다).
  const service = getServiceSupabase();
  const { data: testRow } = await service
    .from("listening_tests_2026")
    .select("id, payload")
    .eq("id", assignment.listening_test_id)
    .maybeSingle();

  if (!testRow || !testRow.payload) {
    return (
      <div className="p-4 text-center text-red-600">
        시험을 찾을 수 없습니다.
      </div>
    );
  }

  await markInProgress(assignmentId, assignment.status);

  return (
    <ListeningSessionContainer
      testData={testRow.payload as LListeningTest2026Linear}
      testId={testRow.id}
      assignmentId={assignmentId}
      mode="test"
    />
  );
}
