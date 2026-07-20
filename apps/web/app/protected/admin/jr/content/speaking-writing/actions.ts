'use server';

import { getSupabaseServer } from '@/lib/supabaseServer';

export async function saveSpeakingWritingTaskAction(input: any) {
  try {
    const supabase = await getSupabaseServer();
    const { data, error } = await supabase
      .from('jr_speaking_writing_tasks')
      .insert([
        {
          title: input.title,
          task_type: input.task_type || 'speaking',
          difficulty: input.difficulty || 'medium',
          level: input.level || 3,
          due_date: input.due_date || null,
          prompt: input.prompt,
          korean_prompt: input.korean_prompt || null,
          preparation_time: input.preparation_time || 15,
          response_time: input.response_time || 45,
          sample_answer: input.sample_answer || null,
          sample_answer_korean: input.sample_answer_korean || null,
          rubric: input.rubric || null,
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

export async function updateSpeakingWritingTaskAction(input: any) {
  try {
    const supabase = await getSupabaseServer();
    const { data, error } = await supabase
      .from('jr_speaking_writing_tasks')
      .update({
        title: input.title,
        task_type: input.task_type || 'speaking',
        difficulty: input.difficulty || 'medium',
        level: input.level || 3,
        due_date: input.due_date || null,
        prompt: input.prompt,
        korean_prompt: input.korean_prompt || null,
        preparation_time: input.preparation_time || 15,
        response_time: input.response_time || 45,
        sample_answer: input.sample_answer || null,
        sample_answer_korean: input.sample_answer_korean || null,
        rubric: input.rubric || null,
        textbook_mapping: input.textbook_mapping || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.id)
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
