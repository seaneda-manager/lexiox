import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import DailyTaskPlayer from "@/components/student/DailyTaskPlayer";

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

  // 문제들 조회
  const [
    { data: completeWords },
    { data: dailyLife },
    { data: academic },
  ] = await Promise.all([
    task.complete_words_ids && task.complete_words_ids.length > 0
      ? supabase
          .from("problem_bank_complete_words_2026")
          .select("*")
          .in("id", task.complete_words_ids)
      : Promise.resolve({ data: [] }),
    task.daily_life_ids && task.daily_life_ids.length > 0
      ? supabase
          .from("problem_bank_daily_life_2026")
          .select("*")
          .in("id", task.daily_life_ids)
      : Promise.resolve({ data: [] }),
    task.academic_passage_ids && task.academic_passage_ids.length > 0
      ? supabase
          .from("problem_bank_academic_passage_2026")
          .select("*")
          .in("id", task.academic_passage_ids)
      : Promise.resolve({ data: [] }),
  ]);

  const taskWithProblems = {
    ...task,
    complete_words: completeWords ?? [],
    daily_life: dailyLife ?? [],
    academic_passage: academic ?? [],
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <DailyTaskPlayer task={taskWithProblems} />
    </div>
  );
}
