'use server';

import { revalidatePath } from 'next/cache';
import { getServerSupabase } from '@/lib/supabase/server';
import { getServiceSupabase } from '@/lib/supabase/service';

export type NewQuestionInput = {
  section: 'grammar' | 'vocab' | 'listening' | 'reading' | 'speaking';
  prompt: string;
  passageText: string;
  audioUrl: string;
  choices: string[]; // 빈 문자열 제외하고 저장. speaking은 빈 배열.
  correctIndex: number; // choices 배열 기준 인덱스 (speaking이면 무시)
};

const CHOICE_IDS = ['a', 'b', 'c', 'd', 'e'];

export async function addQuestionAction(
  input: NewQuestionInput,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  if (!input.prompt.trim()) return { error: '문제 내용을 입력해 주세요.' };

  const cleanChoices = input.choices.map((c) => c.trim()).filter(Boolean);
  const isSpeaking = input.section === 'speaking';
  if (!isSpeaking && cleanChoices.length < 2) {
    return { error: '보기를 2개 이상 입력해 주세요.' };
  }

  const service = getServiceSupabase();
  const { data: existing } = await service
    .from('level_test_questions')
    .select('order_index')
    .eq('section', input.section)
    .order('order_index', { ascending: false })
    .limit(1);
  const nextOrder = ((existing ?? [])[0]?.order_index ?? 0) + 1;

  const choicesPayload = isSpeaking
    ? null
    : cleanChoices.map((text, i) => ({ id: CHOICE_IDS[i], text }));
  const correctChoiceId = isSpeaking ? null : CHOICE_IDS[input.correctIndex] ?? null;

  const { error } = await service.from('level_test_questions').insert({
    section: input.section,
    order_index: nextOrder,
    prompt: input.prompt.trim(),
    passage_text: input.passageText.trim() || null,
    audio_url: input.audioUrl.trim() || null,
    choices: choicesPayload,
    correct_choice_id: correctChoiceId,
    is_active: true,
    created_by: user.id,
  });
  if (error) return { error: error.message };

  revalidatePath('/admin/level-test/questions');
  return { ok: true };
}

export async function toggleQuestionActiveAction(id: string, isActive: boolean): Promise<void> {
  const service = getServiceSupabase();
  await service.from('level_test_questions').update({ is_active: isActive }).eq('id', id);
  revalidatePath('/admin/level-test/questions');
}
