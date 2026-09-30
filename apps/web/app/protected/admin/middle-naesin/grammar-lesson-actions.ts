'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getServerSupabase } from '@/lib/supabase/server';
import { validateGrammarLesson } from '@/models/middle-naesin/grammar-lesson';

const reviewPath = (unitId: string, contentId: string) => `/admin/middle-naesin/units/${unitId}/grammar/${contentId}`;

function back(unitId: string, contentId: string, params: Record<string, string>): never {
  const qs = new URLSearchParams(params).toString();
  redirect(`${reviewPath(unitId, contentId)}?${qs}`);
}

// 관리자가 JSON 을 고쳐 저장하면 항상 초안(draft)으로 돌아간다. (수정 후 다시 확정해야 학생에게 보임)
export async function saveGrammarLessonAction(formData: FormData) {
  const contentId = formData.get('content_id') as string;
  const unitId = formData.get('unit_id') as string;
  const raw = (formData.get('lesson_json') as string) ?? '';

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    back(unitId, contentId, { error: `JSON 형식이 올바르지 않습니다: ${(e as Error).message}` });
  }
  const res = validateGrammarLesson(parsed);
  if ('errors' in res) back(unitId, contentId, { error: res.errors.slice(0, 8).join(' / ') });

  const supabase = await getServerSupabase();
  const { data: row, error: readErr } = await supabase
    .from('middle_naesin_contents')
    .select('extra_data')
    .eq('id', contentId)
    .single();
  if (readErr) back(unitId, contentId, { error: readErr.message });

  const lesson = { ...(res.ok ? res.lesson : {}), status: 'draft', finalizedAt: undefined };
  const extra = { ...((row?.extra_data as Record<string, unknown> | null) ?? {}), lesson };
  const { error } = await supabase.from('middle_naesin_contents').update({ extra_data: extra }).eq('id', contentId);
  if (error) back(unitId, contentId, { error: error.message });

  revalidatePath(reviewPath(unitId, contentId));
  back(unitId, contentId, { msg: '저장했습니다. (초안 상태 — 확인 후 확정하세요)' });
}

export async function setGrammarLessonStatusAction(formData: FormData) {
  const contentId = formData.get('content_id') as string;
  const unitId = formData.get('unit_id') as string;
  const status = formData.get('status') === 'final' ? 'final' : 'draft';

  const supabase = await getServerSupabase();
  const { data: row, error: readErr } = await supabase
    .from('middle_naesin_contents')
    .select('extra_data')
    .eq('id', contentId)
    .single();
  if (readErr) back(unitId, contentId, { error: readErr.message });

  const extraData = (row?.extra_data as Record<string, unknown> | null) ?? {};
  const res = validateGrammarLesson(extraData.lesson);
  if ('errors' in res) back(unitId, contentId, { error: `확정할 수 없습니다: ${res.errors.slice(0, 5).join(' / ')}` });

  const lesson = {
    ...(res.ok ? res.lesson : {}),
    status,
    finalizedAt: status === 'final' ? new Date().toISOString() : undefined,
  };
  const { error } = await supabase
    .from('middle_naesin_contents')
    .update({ extra_data: { ...extraData, lesson } })
    .eq('id', contentId);
  if (error) back(unitId, contentId, { error: error.message });

  revalidatePath(reviewPath(unitId, contentId));
  revalidatePath(`/admin/middle-naesin/units/${unitId}`);
  revalidatePath(`/naesin/middle/${unitId}/drill`);
  back(unitId, contentId, { msg: status === 'final' ? '확정했습니다. 이제 학생에게 보입니다.' : '초안으로 되돌렸습니다. 학생에게 보이지 않습니다.' });
}
