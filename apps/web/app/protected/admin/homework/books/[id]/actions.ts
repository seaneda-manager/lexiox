'use server';

import { revalidatePath } from 'next/cache';
import { getServerSupabase } from '@/lib/supabase/server';
import { getServiceSupabase } from '@/lib/supabase/service';
import { syncPlanAssignments } from '@/lib/homework/generatePlanAssignments';

export type AnswerItem = { number: number; answer: string; hint?: string | null };

export async function addUnitAction(
  bookId: string,
  title: string,
  items: AnswerItem[],
): Promise<{ ok: true } | { error: string }> {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  if (items.length === 0) return { error: '정답을 1개 이상 입력해 주세요.' };

  const service = getServiceSupabase();
  const { data: existingUnits } = await service
    .from('homework_book_units')
    .select('unit_index')
    .eq('book_id', bookId)
    .order('unit_index', { ascending: false })
    .limit(1);

  const nextIndex = ((existingUnits ?? [])[0]?.unit_index ?? 0) + 1;

  const { error } = await service.from('homework_book_units').insert({
    book_id: bookId,
    unit_index: nextIndex,
    title: title.trim() || null,
    answer_key_data: { items },
  });
  if (error) return { error: error.message };

  // 이 교재를 이미 배정받은 학생들의 플랜에 새 유닛을 자동으로 이어붙인다.
  const { data: plans } = await service
    .from('student_homework_plans')
    .select('id')
    .eq('book_id', bookId)
    .eq('is_enabled', true)
    .eq('is_paused', false);
  for (const p of plans ?? []) {
    await syncPlanAssignments(p.id);
  }

  revalidatePath(`/admin/homework/books/${bookId}`);
  return { ok: true };
}

export async function createPlanAction(
  bookId: string,
  studentId: string,
  weekdays: number[],
  unitsPerSession: number,
  startDate: string,
): Promise<{ ok: true; created: number } | { error: string }> {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  if (!studentId) return { error: '학생을 선택해 주세요.' };
  if (weekdays.length === 0) return { error: '요일을 1개 이상 선택해 주세요.' };

  const service = getServiceSupabase();
  const { data: plan, error } = await service
    .from('student_homework_plans')
    .upsert(
      {
        student_id: studentId,
        book_id: bookId,
        start_date: startDate,
        weekdays,
        units_per_session: unitsPerSession,
        is_enabled: true,
        is_paused: false,
        created_by: user.id,
      },
      { onConflict: 'student_id,book_id' },
    )
    .select('id')
    .single();
  if (error) return { error: error.message };

  const result = await syncPlanAssignments(plan.id);
  if ('error' in result) return { error: result.error };

  revalidatePath(`/admin/homework/books/${bookId}`);
  return { ok: true, created: result.created };
}

export async function togglePlanAction(planId: string, bookId: string, isPaused: boolean): Promise<void> {
  const service = getServiceSupabase();
  await service.from('student_homework_plans').update({ is_paused: isPaused }).eq('id', planId);
  revalidatePath(`/admin/homework/books/${bookId}`);
}
