'use server';

import { revalidatePath } from 'next/cache';
import { getServerSupabase } from '@/lib/supabase/server';
import { getServiceSupabase } from '@/lib/supabase/service';

function revalidate(passageId: string) {
  revalidatePath(`/admin/hi-naesin/passages/${passageId}/edit`);
}

// ── 학생에게 지문 배정 ────────────────────────────────────
export async function assignPassageAction(
  passageId: string,
  fd: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await getServerSupabase();
  const adminDb  = getServiceSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '로그인 필요' };

  const studentIds  = fd.getAll('student_ids') as string[];
  const assignType  = (fd.get('assignment_type') as string) || 'full';
  const dueAt       = (fd.get('due_at') as string) || null;
  const note        = (fd.get('note') as string)?.trim() || null;

  if (studentIds.length === 0) return { ok: false, error: '학생을 선택하세요' };

  const rows = studentIds.map((sid) => ({
    student_id:      sid,
    passage_id:      passageId,
    assigned_by:     user.id,
    assignment_type: assignType,
    status:          'assigned',
    due_at:          dueAt || null,
    note,
  }));

  // upsert: 같은 학생+지문+타입이면 업데이트
  const { error } = await adminDb
    .from('hi_naesin_assignments')
    .upsert(rows, { onConflict: 'student_id,passage_id,assignment_type' });

  if (error) return { ok: false, error: error.message };

  revalidate(passageId);
  return { ok: true };
}

// ── Drill 타입 토글 ────────────────────────────────────────
export async function updateEnabledDrillTypesAction(
  passageId: string,
  assignmentId: string,
  enabledTypes: string[] | null,
): Promise<{ ok: boolean; error?: string }> {
  const adminDb = getServiceSupabase();

  const { error } = await adminDb
    .from('hi_naesin_assignments')
    .update({ enabled_drill_types: enabledTypes })
    .eq('id', assignmentId);

  if (error) return { ok: false, error: error.message };

  revalidate(passageId);
  return { ok: true };
}

// ── 배정 취소 ──────────────────────────────────────────────
export async function removeAssignmentAction(
  passageId: string,
  assignmentId: string,
): Promise<{ ok: boolean; error?: string }> {
  const adminDb = getServiceSupabase();

  const { error } = await adminDb
    .from('hi_naesin_assignments')
    .delete()
    .eq('id', assignmentId);

  if (error) return { ok: false, error: error.message };

  revalidate(passageId);
  return { ok: true };
}
