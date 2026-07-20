// apps/web/actions/listening.ts (?덉떆 ?꾩튂; ?꾩옱 ?뚯씪 ?꾩튂 ?좎? 媛??
'use server';

import { getSupabaseServer } from '@/lib/supabaseServer';
import type { Mode } from '@/lib/consumePlay';
// ?꾩슂 ??吏㏃?/湲??쒓린 蹂?섏쓣 ?먰븳?ㅻ㈃ ?꾨옒 二쇱꽍 ?댁젣 ???ъ슜
// import { canonicalMode } from '@/lib/consumePlay';

export type StartListeningSessionArgs = {
  setId: string;
  /** 'p' | 't' | 'r' ?먮뒗 consume-play??Mode ???*/
  mode: Mode;
};

export async function startListeningSession(
  { setId, mode }: StartListeningSessionArgs
): Promise<{ sessionId: string }> {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr) throw new Error(authErr.message);
  if (!user) throw new Error('Not authenticated');

  // DB媛 'p'|'t'|'r'??湲곕??섎㈃ 洹몃?濡????
  // 'study'|'test'|'review'瑜??먰븯硫?canonicalMode(mode) ?ъ슜
  // const normalized = canonicalMode(mode) as any;

  const { data, error } = await supabase
    .from('listening_sessions')
    .insert({ user_id: user.id, set_id: setId, mode /*: normalized*/ })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return { sessionId: data.id as string };
}

export type SubmitListeningAnswerArgs = {
  sessionId: string;
  questionId: string;
  choiceId?: string;
};

export async function submitListeningAnswer(
  { sessionId, questionId, choiceId }: SubmitListeningAnswerArgs
): Promise<{ ok: true }> {
  const supabase = await getSupabaseServer();

  // 誘몄꽑????젣)
  if (!choiceId) {
    const { error } = await supabase
      .from('listening_answers')
      .delete()
      .eq('session_id', sessionId)
      .eq('question_id', questionId);

    if (error) throw new Error(error.message);
    return { ok: true };
  }

  // ?좏깮/媛깆떊(upsert)
  const { error } = await supabase
    .from('listening_answers')
    .upsert(
      { session_id: sessionId, question_id: questionId, choice_id: choiceId },
      { onConflict: 'session_id,question_id' }
    );

  if (error) throw new Error(error.message);
  return { ok: true };
}

export type FinishListeningSessionArgs = { sessionId: string };

export async function finishListeningSession(
  { sessionId }: FinishListeningSessionArgs
): Promise<{ ok: true }> {
  const supabase = await getSupabaseServer();

  const { error } = await supabase
    .from('listening_sessions')
    .update({ finished_at: new Date().toISOString() })
    .eq('id', sessionId);

  if (error) throw new Error(error.message);
  return { ok: true };
}




