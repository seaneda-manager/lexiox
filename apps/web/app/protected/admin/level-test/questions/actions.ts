'use server';

import { revalidatePath } from 'next/cache';
import { getServerSupabase } from '@/lib/supabase/server';
import { getServiceSupabase } from '@/lib/supabase/service';
import { generateLevelTestQuestion, type GeneratedQuestion } from '@/lib/level-test/generateQuestion';
import type { Track, SubLevel, Section } from '@/lib/level-test/proficiencyLevels';

export type NewQuestionInput = {
  section: Section;
  prompt: string;
  passageText: string;
  audioUrl: string;
  choices: string[]; // 빈 문자열 제외하고 저장. speaking/writing은 빈 배열.
  correctIndex: number; // choices 배열 기준 인덱스 (서술형이면 무시)
  track?: Track | null;
  subLevel?: SubLevel | null;
  generatedByAi?: boolean;
};

const CHOICE_IDS = ['a', 'b', 'c', 'd', 'e'];
const OPEN_RESPONSE_SECTIONS: Section[] = ['speaking', 'writing'];

export async function addQuestionAction(
  input: NewQuestionInput,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  if (!input.prompt.trim()) return { error: '문제 내용을 입력해 주세요.' };

  const isOpenResponse = OPEN_RESPONSE_SECTIONS.includes(input.section);
  const cleanChoices = input.choices.map((c) => c.trim()).filter(Boolean);
  if (!isOpenResponse && cleanChoices.length < 2) {
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

  const choicesPayload = isOpenResponse
    ? null
    : cleanChoices.map((text, i) => ({ id: CHOICE_IDS[i], text }));
  const correctChoiceId = isOpenResponse ? null : CHOICE_IDS[input.correctIndex] ?? null;

  const { error } = await service.from('level_test_questions').insert({
    section: input.section,
    order_index: nextOrder,
    prompt: input.prompt.trim(),
    passage_text: input.passageText.trim() || null,
    audio_url: input.audioUrl.trim() || null,
    choices: choicesPayload,
    correct_choice_id: correctChoiceId,
    track: input.track ?? null,
    sub_level: input.subLevel ?? null,
    generated_by_ai: input.generatedByAi ?? false,
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

export async function generateQuestionAction(
  section: Section,
  track: Track,
  subLevel: SubLevel,
  topic: string,
): Promise<{ ok: true; question: GeneratedQuestion } | { error: string }> {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  if (section === 'listening') {
    return { error: '듣기는 오디오 생성이 아직 연동되지 않아 AI 생성을 지원하지 않습니다. 수동으로 추가해 주세요.' };
  }

  try {
    const question = await generateLevelTestQuestion(section, track, subLevel, topic);
    return { ok: true, question };
  } catch (e: any) {
    return { error: e?.message ?? 'AI 생성 중 오류가 발생했습니다.' };
  }
}
