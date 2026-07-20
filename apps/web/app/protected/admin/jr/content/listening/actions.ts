'use server';

import { getSupabaseServer } from '@/lib/supabaseServer';

export async function saveListeningSessionAction(input: any) {
  try {
    const supabase = await getSupabaseServer();
    const { data, error } = await supabase
      .from('jr_listening_sessions')
      .insert([
        {
          title: input.title,
          difficulty: input.difficulty || 'medium',
          level: input.level || 3,
          textbook: input.textbook || null,
          audio_url: input.audio_url,
          audio_transcript: input.audio_transcript,
          korean_transcript: input.korean_transcript || null,
          listening_type: input.listening_type || 'conversation',
          keywords: input.keywords || [],
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

export async function updateListeningSessionAction(input: any) {
  try {
    const supabase = await getSupabaseServer();
    const { data, error } = await supabase
      .from('jr_listening_sessions')
      .update({
        title: input.title,
        difficulty: input.difficulty || 'medium',
        level: input.level || 3,
        textbook: input.textbook || null,
        audio_url: input.audio_url,
        audio_transcript: input.audio_transcript,
        korean_transcript: input.korean_transcript || null,
        listening_type: input.listening_type || 'conversation',
        keywords: input.keywords || [],
        questions: input.questions || [],
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
