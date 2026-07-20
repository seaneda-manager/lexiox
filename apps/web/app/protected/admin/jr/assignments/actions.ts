"use server";

import { getSupabaseServer } from "@/lib/supabaseServer";

export async function assignReadingSessionAction(input: {
  studentId: string;
  passageId: string;
  teacherId: string;
}) {
  try {
    const supabase = await getSupabaseServer();

    const { data, error } = await supabase
      .from("jr_reading_sessions")
      .insert([
        {
          student_id: input.studentId,
          passage_id: input.passageId,
          stage: "vocabulary",
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, data };
  } catch (e: any) {
    return { ok: false, error: e?.message };
  }
}

export async function assignGrammarSessionAction(input: {
  studentId: string;
  chapterId: string;
  teacherId: string;
}) {
  try {
    const supabase = await getSupabaseServer();

    const { data, error } = await supabase
      .from("jr_grammar_sessions")
      .insert([
        {
          student_id: input.studentId,
          chapter_id: input.chapterId,
          stage: "lesson",
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, data };
  } catch (e: any) {
    return { ok: false, error: e?.message };
  }
}
