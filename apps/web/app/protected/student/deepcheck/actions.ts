'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';

const SKILL_KEYS = ['reading', 'listening', 'speaking', 'writing', 'grammar', 'vocab'] as const;

export type DeepCheckInput = {
  coreConcepts: string[];
  weaknesses: string[];
  strengths: string[];
  englishExplanation: string;
  skillsCovered: string[];
};

function sanitizeInput(input: DeepCheckInput) {
  return {
    core_concepts: input.coreConcepts.map((s) => s.trim()).filter(Boolean),
    weaknesses: input.weaknesses.map((s) => s.trim()).filter(Boolean),
    strengths: input.strengths.map((s) => s.trim()).filter(Boolean),
    english_explanation: input.englishExplanation.trim() || null,
    skills_covered: input.skillsCovered.filter((s) => (SKILL_KEYS as readonly string[]).includes(s)),
  };
}

export async function createDeepCheckAction(
  input: DeepCheckInput,
): Promise<{ error: string } | never> {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  const row = sanitizeInput(input);
  if (row.core_concepts.length === 0) return { error: '중심 개념을 1개 이상 입력해 주세요.' };

  const { data, error } = await supabase
    .from('deepcheck_sessions')
    .insert({ student_id: user.id, ...row, status: 'ready' })
    .select('id')
    .single();
  if (error) return { error: error.message };

  redirect(`/student/deepcheck/${data.id}`);
}

export async function updateDeepCheckAction(
  id: string,
  input: DeepCheckInput,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  const row = sanitizeInput(input);
  if (row.core_concepts.length === 0) return { error: '중심 개념을 1개 이상 입력해 주세요.' };

  const { error } = await supabase
    .from('deepcheck_sessions')
    .update(row)
    .eq('id', id)
    .eq('student_id', user.id);
  if (error) return { error: error.message };

  revalidatePath(`/student/deepcheck/${id}`);
  return { ok: true };
}
