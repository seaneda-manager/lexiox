"use server";

import { getSupabaseServer } from "@/lib/supabaseServer";

export async function saveReadingPassageAction(input: any) {
  try {
    const supabase = await getSupabaseServer();

    const { data, error } = await supabase
      .from("jr_reading_passages")
      .insert([
        {
          title: input.title,
          content: input.content,
          difficulty: input.difficulty,
          level: input.level || 3,
          textbook: input.textbook || null,
          korean_translation: input.korean_translation || null,
          grammar_analysis: input.grammar_analysis || null,
          vocabulary: input.vocabulary || [],
          questions: input.questions || [],
          textbook_mapping: input.textbook_mapping || null,
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

export async function updateReadingPassageAction(input: any) {
  try {
    const supabase = await getSupabaseServer();

    const { data, error } = await supabase
      .from("jr_reading_passages")
      .update({
        title: input.title,
        content: input.content,
        difficulty: input.difficulty,
        level: input.level || 3,
        textbook: input.textbook || null,
        korean_translation: input.korean_translation || null,
        grammar_analysis: input.grammar_analysis || null,
        vocabulary: input.vocabulary || [],
        questions: input.questions || [],
        textbook_mapping: input.textbook_mapping || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.id)
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
