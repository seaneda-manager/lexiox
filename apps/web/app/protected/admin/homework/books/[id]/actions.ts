'use server';

import { revalidatePath } from 'next/cache';
import { getServerSupabase } from '@/lib/supabase/server';
import { getServiceSupabase } from '@/lib/supabase/service';
import { syncPlanAssignments } from '@/lib/homework/generatePlanAssignments';

export type AnswerItem = { number: number; answer: string; hint?: string | null };

async function nextUnitIndex(service: ReturnType<typeof getServiceSupabase>, bookId: string): Promise<number> {
  const { data: existingUnits } = await service
    .from('homework_book_units')
    .select('unit_index')
    .eq('book_id', bookId)
    .order('unit_index', { ascending: false })
    .limit(1);
  return ((existingUnits ?? [])[0]?.unit_index ?? 0) + 1;
}

async function syncAllPlansForBook(service: ReturnType<typeof getServiceSupabase>, bookId: string) {
  const { data: plans } = await service
    .from('student_homework_plans')
    .select('id')
    .eq('book_id', bookId)
    .eq('is_enabled', true)
    .eq('is_paused', false);
  for (const p of plans ?? []) {
    await syncPlanAssignments(p.id);
  }
}

// 정답 없이 제목만으로도 유닛을 만들 수 있다 — 교재 스캔(정답 입력) 전에
// 커리큘럼 구조(챕터/유닛/서브챕터/서브유닛)부터 먼저 등록해두기 위함.
// 정답이 없는 유닛은 syncPlanAssignments가 자동으로 건너뛰고, 나중에 채워지면 그때 생성된다.
export async function addUnitAction(
  bookId: string,
  title: string,
  items: AnswerItem[],
): Promise<{ ok: true } | { error: string }> {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  const service = getServiceSupabase();
  const nextIndex = await nextUnitIndex(service, bookId);

  const { error } = await service.from('homework_book_units').insert({
    book_id: bookId,
    unit_index: nextIndex,
    title: title.trim() || null,
    answer_key_data: { items },
  });
  if (error) return { error: error.message };

  await syncAllPlansForBook(service, bookId);

  revalidatePath(`/admin/homework/books/${bookId}`);
  return { ok: true };
}

// 챕터/유닛/서브챕터/서브유닛 제목을 한 줄씩 붙여넣어 한 번에 등록한다 (정답은 비워둠).
export async function bulkAddUnitsAction(
  bookId: string,
  titles: string[],
): Promise<{ ok: true; created: number } | { error: string }> {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  const cleanTitles = titles.map((t) => t.trim()).filter(Boolean);
  if (cleanTitles.length === 0) return { error: '제목을 1개 이상 입력해 주세요.' };

  const service = getServiceSupabase();
  const startIndex = await nextUnitIndex(service, bookId);

  const rows = cleanTitles.map((title, i) => ({
    book_id: bookId,
    unit_index: startIndex + i,
    title,
    answer_key_data: { items: [] },
  }));

  const { error } = await service.from('homework_book_units').insert(rows);
  if (error) return { error: error.message };

  revalidatePath(`/admin/homework/books/${bookId}`);
  return { ok: true, created: rows.length };
}

// 나중에(스캔 후) 빈 유닛에 정답을 채워 넣는다. 채워지는 순간 해당 유닛부터
// 스케줄에 맞춰 자동으로 숙제가 생성될 수 있으므로 관련 플랜을 다시 동기화한다.
export async function updateUnitAction(
  unitId: string,
  bookId: string,
  title: string,
  items: AnswerItem[],
): Promise<{ ok: true } | { error: string }> {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  const service = getServiceSupabase();
  const { error } = await service
    .from('homework_book_units')
    .update({ title: title.trim() || null, answer_key_data: { items } })
    .eq('id', unitId);
  if (error) return { error: error.message };

  await syncAllPlansForBook(service, bookId);

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
