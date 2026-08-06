import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import DailyTaskPlayer from "@/components/student/DailyTaskPlayer";
import { fetchAndFormatDailyTaskProblems } from "@/lib/utils/dailyTaskFormat";

type Params = {
  id: string;
};

export const dynamic = "force-dynamic";

export default async function DailyTaskPage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  // 현재 사용자 확인
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect("/login");
  }

  // Daily Test 조회
  const { data: task, error: taskError } = await supabase
    .from("daily_tests")
    .select("*")
    .eq("id", id)
    .eq("student_id", user.id)
    .single();

  if (taskError || !task) {
    redirect("/student");
  }

  // 이미 제출된 과제는 재풀이 대신 리뷰 페이지로 보낸다
  if (task.status === "completed") {
    redirect(`/student/daily-tests/${id}/review`);
  }

  const { complete_words, daily_life, academic_passage } = await fetchAndFormatDailyTaskProblems(
    supabase,
    task
  );

  const taskWithProblems = {
    ...task,
    complete_words,
    daily_life,
    academic_passage,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <DailyTaskPlayer task={taskWithProblems} />
    </div>
  );
}
