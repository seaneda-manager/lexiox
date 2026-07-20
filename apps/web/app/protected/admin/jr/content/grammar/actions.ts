"use server";

import { getSupabaseServer } from "@/lib/supabaseServer";

export async function saveGrammarChapterAction(input: any) {
  try {
    const supabase = await getSupabaseServer();
    const { data, error } = await supabase
      .from("jr_grammar_chapters")
      .insert([
        {
          title: input.title,
          difficulty: input.difficulty || "medium",
          level: input.level || 3,
          textbook: input.textbook || null,
          explanation: input.explanation || null,
          korean_explanation: input.korean_explanation || null,
          key_points: input.key_points || null,
          examples: input.examples || [],
          exercises: input.exercises || [],
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

export async function updateGrammarChapterAction(input: any) {
  try {
    const supabase = await getSupabaseServer();
    const { data, error } = await supabase
      .from("jr_grammar_chapters")
      .update({
        title: input.title,
        difficulty: input.difficulty || "medium",
        level: input.level || 3,
        textbook: input.textbook || null,
        explanation: input.explanation || null,
        korean_explanation: input.korean_explanation || null,
        key_points: input.key_points || null,
        examples: input.examples || [],
        exercises: input.exercises || [],
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
