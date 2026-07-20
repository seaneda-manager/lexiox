"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function saveLectureCompletionAction(
  lectureId: string,
  quizScore: number,
  quizTotal: number
) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("lecture_completions").upsert(
    {
      lecture_id: lectureId,
      student_id: user.id,
      quiz_score: quizScore,
      quiz_total: quizTotal,
      completed_at: new Date().toISOString(),
    },
    { onConflict: "lecture_id,student_id" }
  );

  revalidatePath(`/student/lectures/${lectureId}`);
  revalidatePath("/student/lectures");
}

export async function submitLectureQuestionAction(lectureId: string, formData: FormData) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const body = (formData.get("body") as string ?? "").trim();
  if (!body) return;

  await supabase.from("lecture_questions").insert({
    lecture_id: lectureId,
    student_id: user.id,
    body,
  });

  revalidatePath(`/student/lectures/${lectureId}`);
}
