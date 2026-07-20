'use server';

import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';

export type NaesinProgressSnapshot = {
  currentStage: string;
  currentSentenceIndex: number;
  structureLogs: unknown[];
  translationLogs: unknown[];
  compositionLogs: unknown[];
  sentenceFunctionLogs: unknown[];
};

export async function startNaesinDrillSessionAction(
  fd: FormData,
): Promise<void> {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인 필요');

  const passageId = (fd.get('passage_id') as string)?.trim();
  if (!passageId) throw new Error('passage_id 없음');

  // 진행 중인 세션이 있으면 재사용
  const { data: existing } = await supabase
    .from('naesin_sessions')
    .select('id')
    .eq('student_id', user.id)
    .eq('passage_id', passageId)
    .eq('status', 'started')
    .maybeSingle();

  if (existing?.id) {
    redirect(`/naesin/drill/${existing.id}`);
  }

  const { data, error } = await supabase
    .from('naesin_sessions')
    .insert({
      student_id: user.id,
      passage_id: passageId,
      status:     'started',
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);

  redirect(`/naesin/drill/${data.id}`);
}

export async function saveNaesinSessionProgressAction(
  sessionId: string,
  snapshot: NaesinProgressSnapshot,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from('naesin_sessions')
    .update({ logs: snapshot })
    .eq('id', sessionId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function completeNaesinSessionAction(
  sessionId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from('naesin_sessions')
    .update({ status: 'submitted', submitted_at: new Date().toISOString() })
    .eq('id', sessionId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
