'use server';

import { revalidatePath } from 'next/cache';
import { getServerSupabase } from '@/lib/supabase/server';
import { getServiceSupabase } from '@/lib/supabase/service';

function revalidate(unitId: string) {
  revalidatePath(`/admin/middle-naesin/units/${unitId}`);
}

// ── 학생에게 단원 배정 ────────────────────────────────────
export async function assignUnitAction(
  unitId: string,
  fd: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await getServerSupabase();
  const adminDb  = getServiceSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '로그인 필요' };

  const studentIds = fd.getAll('student_ids') as string[];
  const dueAt      = (fd.get('due_at') as string) || null;
  const note       = (fd.get('note') as string)?.trim() || null;

  if (studentIds.length === 0) return { ok: false, error: '학생을 선택하세요' };

  const rows = studentIds.map((sid) => ({
    student_id:  sid,
    unit_id:     unitId,
    assigned_by: user.id,
    due_at:      dueAt || null,
    note,
  }));

  const { error } = await adminDb
    .from('middle_naesin_assignments')
    .upsert(rows, { onConflict: 'student_id,unit_id' });

  if (error) return { ok: false, error: error.message };

  revalidate(unitId);
  return { ok: true };
}

// ── 배정 취소 ──────────────────────────────────────────────
export async function removeAssignmentAction(
  unitId: string,
  assignmentId: string,
): Promise<{ ok: boolean; error?: string }> {
  const adminDb = getServiceSupabase();

  const { error } = await adminDb
    .from('middle_naesin_assignments')
    .delete()
    .eq('id', assignmentId);

  if (error) return { ok: false, error: error.message };

  revalidate(unitId);
  return { ok: true };
}
