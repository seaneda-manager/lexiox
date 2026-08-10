import { notFound, redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { fetchAndFormatDailyTaskProblems } from "@/lib/utils/dailyTaskFormat";
import { buildFlatQuestions } from "@/app/protected/student/daily-tests/[id]/review/page";
import { ReadingDrillClient } from "@/app/protected/student/reading/drill/[resultId]/[questionId]/_client/ReadingDrillClient";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string; questionId: string }> };

export default async function DailyTaskDrillPage({ params }: PageProps) {
  const { id, questionId } = await params;
  const supabase = await getServerSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: task, error: taskError } = await supabase
    .from("daily_tests")
    .select("*")
    .eq("id", id)
    .eq("student_id", user.id)
    .single();

  if (taskError || !task) redirect("/student");
  if (task.status !== "completed") redirect(`/student/daily-tests/${id}`);

  const { daily_life, academic_passage } = await fetchAndFormatDailyTaskProblems(supabase, task);
  const flatQuestions = buildFlatQuestions([...daily_life, ...academic_passage]);
  const q = flatQuestions.find((x) => x.id === questionId);
  if (!q) notFound();

  const answerMap: Record<string, string | null> = task.answers ?? {};
  const chosenId = answerMap[q.id] ?? null;
  const chosenChoice = q.choices.find((c) => c.id === chosenId);
  const correctChoice = q.choices.find((c) => c.isCorrect);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <ReadingDrillClient
        resultId={id}
        backHref={`/student/daily-tests/${id}/review`}
        questionData={{
          id: q.id,
          number: q.number,
          stem: q.stem,
          paragraph: q.passageText,
          type: q.type,
          choices: q.choices,
          userAnswer: chosenChoice?.text ?? null,
          userAnswerId: chosenId,
          correctAnswer: correctChoice?.text ?? "",
          isCorrect: chosenChoice?.isCorrect ?? false,
        }}
      />
    </div>
  );
}
