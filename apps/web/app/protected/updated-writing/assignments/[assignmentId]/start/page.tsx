import { notFound, redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import WritingTestClient from "../../../test/_client/WritingTestClient";
import type { WWritingTest2026 } from "@/models/writing";

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

export default async function StartWritingAssignmentPage({ params }: { params: Params }) {
  const { assignmentId } = await params;
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: assignment } = await supabase
    .from("test_assignments")
    .select("id, status, sections, writing_test_id")
    .eq("id", assignmentId)
    .eq("student_id", user.id)
    .maybeSingle();

  if (!assignment || !assignment.writing_test_id) notFound();

  // writing_tests RLS는 인증된 사용자 전체 read를 허용하므로(정책: for select to authenticated using (true))
  // 일반 세션 client로도 조회 가능하지만, 배정 소유권은 이미 위에서 확인했으므로 service client로 통일한다.
  const service = getServiceSupabase();
  const { data: testRow } = await service
    .from("writing_tests")
    .select("id, label, payload")
    .eq("id", assignment.writing_test_id)
    .maybeSingle();

  if (!testRow || !testRow.payload) notFound();

  await markInProgress(assignmentId, assignment.status);

  return (
    <WritingTestClient
      test={testRow.payload as WWritingTest2026}
      testId={testRow.id}
      assignmentId={assignmentId}
    />
  );
}
