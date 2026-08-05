import { getServerSupabase } from "@/lib/supabase/server";
import ListeningTestWrapper from "./_client";

export const dynamic = "force-dynamic";

export default async function ListeningStartPage({
  params,
  searchParams,
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
    .select(`
      id, status, listening_test_id,
      listening_tests (
        id, label, sections, estimated_duration_minutes, intro_html,
        listening_test_parts (
          id, part_number, title, intro_html,
          listening_test_questions (
            id, question_number, question_type, question_text,
            listening_test_answer_choices (
              id, choice_number, choice_text
            ),
            correct_answer_choice_number
          )
        )
      )
    `)
    .eq("id", assignmentId)
    .eq("student_id", user.id)
    .single();

  if (!assignment || !assignment.listening_tests) {
    return (
      <div className="p-4 text-center text-red-600">
        시험을 찾을 수 없습니다.
      </div>
    );
  }

  const test = Array.isArray(assignment.listening_tests)
    ? assignment.listening_tests[0]
    : assignment.listening_tests;

  return (
    <ListeningTestWrapper
      testData={test}
      testId={test.id}
      assignmentId={assignmentId}
    />
  );
}
