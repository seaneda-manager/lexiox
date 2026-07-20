"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";

function clean(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}

function youtubeId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

export async function createLectureAction(formData: FormData) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const title = clean(formData.get("title"));
  const description = clean(formData.get("description")) || null;
  const youtube_url = clean(formData.get("youtube_url"));
  const duration_raw = clean(formData.get("duration_seconds"));
  const duration_seconds = duration_raw ? parseInt(duration_raw, 10) : null;
  const tags_raw = clean(formData.get("tags"));
  const tags = tags_raw ? tags_raw.split(",").map((t) => t.trim()).filter(Boolean) : [];

  if (!title) throw new Error("제목을 입력하세요");
  if (!youtube_url || !youtubeId(youtube_url)) throw new Error("유효한 YouTube URL을 입력하세요");

  const { data, error } = await supabase
    .from("lectures")
    .insert({ title, description, youtube_url, duration_seconds, tags, created_by: user.id })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "강의 생성 실패");

  revalidatePath("/admin/lectures");
  redirect(`/admin/lectures/${(data as { id: string }).id}/edit`);
}

export async function updateLectureAction(lectureId: string, formData: FormData) {
  const supabase = await getServerSupabase();

  const title = clean(formData.get("title"));
  const description = clean(formData.get("description")) || null;
  const youtube_url = clean(formData.get("youtube_url"));
  const duration_raw = clean(formData.get("duration_seconds"));
  const duration_seconds = duration_raw ? parseInt(duration_raw, 10) : null;
  const tags_raw = clean(formData.get("tags"));
  const tags = tags_raw ? tags_raw.split(",").map((t) => t.trim()).filter(Boolean) : [];
  const is_active = formData.get("is_active") === "on";

  if (!title) throw new Error("제목을 입력하세요");

  const { error } = await supabase
    .from("lectures")
    .update({ title, description, youtube_url, duration_seconds, tags, is_active, updated_at: new Date().toISOString() })
    .eq("id", lectureId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/lectures");
  revalidatePath(`/admin/lectures/${lectureId}/edit`);
}

export async function addQuizQuestionAction(lectureId: string, formData: FormData) {
  const supabase = await getServerSupabase();

  const timestamp_seconds = parseInt(clean(formData.get("timestamp_seconds")), 10);
  const question_text = clean(formData.get("question_text"));
  const blank_answer = clean(formData.get("blank_answer"));
  const hint = clean(formData.get("hint")) || null;

  if (!question_text) throw new Error("질문을 입력하세요");
  if (!blank_answer) throw new Error("정답을 입력하세요");
  if (isNaN(timestamp_seconds)) throw new Error("타임스탬프를 입력하세요");

  const { data: existing } = await supabase
    .from("lecture_quiz_questions")
    .select("sort_order")
    .eq("lecture_id", lectureId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sort_order = ((existing as { sort_order: number } | null)?.sort_order ?? -1) + 1;

  const { error } = await supabase
    .from("lecture_quiz_questions")
    .insert({ lecture_id: lectureId, timestamp_seconds, question_text, blank_answer, hint, sort_order });

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/lectures/${lectureId}/edit`);
}

export async function deleteQuizQuestionAction(lectureId: string, questionId: string) {
  const supabase = await getServerSupabase();
  await supabase.from("lecture_quiz_questions").delete().eq("id", questionId);
  revalidatePath(`/admin/lectures/${lectureId}/edit`);
}

export async function assignLectureAction(lectureId: string, formData: FormData) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const student_id = clean(formData.get("student_id")) || null;
  const due_date = clean(formData.get("due_date")) || null;
  const due_at = due_date ? new Date(`${due_date}T23:59:00+09:00`).toISOString() : null;

  if (!student_id) throw new Error("학생을 선택하세요");

  const { error } = await supabase
    .from("lecture_assignments")
    .insert({ lecture_id: lectureId, student_id, due_at, assigned_by: user.id });

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/lectures/${lectureId}/assign`);
  revalidatePath("/admin/lectures");
}
