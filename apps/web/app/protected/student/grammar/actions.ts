'use server';

import { revalidatePath } from 'next/cache';
import { getServerSupabase } from '@/lib/supabase/server';

// 학생이 레슨을 끝냈다고 표시한다 (개념 × 레벨). 스케줄의 완료 기준이 된다.
export async function markConceptDoneAction(conceptId: string, level: number): Promise<{ ok: true } | { error: string }> {
  if (!Number.isInteger(level) || level < 1 || level > 5) return { error: '레벨 값이 올바르지 않습니다.' };
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };
  const { error } = await supabase
    .from('student_grammar_concept_done')
    .upsert({ student_id: user.id, concept_id: conceptId, level }, { onConflict: 'student_id,concept_id,level', ignoreDuplicates: true });
  if (error) return { error: error.message };
  revalidatePath('/student/grammar');
  return { ok: true };
}
