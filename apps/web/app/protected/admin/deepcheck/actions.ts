'use server';

import { revalidatePath } from 'next/cache';
import { getServerSupabase } from '@/lib/supabase/server';
import { getServiceSupabase } from '@/lib/supabase/service';

async function requireAdminUserId(): Promise<string | null> {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function saveTeacherNotesAction(
  id: string,
  notes: string,
): Promise<{ ok: true } | { error: string }> {
  const userId = await requireAdminUserId();
  if (!userId) return { error: '로그인이 필요합니다.' };

  const service = getServiceSupabase();
  const { error } = await service
    .from('deepcheck_sessions')
    .update({ teacher_notes: notes.trim() || null })
    .eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/admin/deepcheck');
  return { ok: true };
}

export async function setSessionCompletedAction(
  id: string,
  completed: boolean,
): Promise<{ ok: true } | { error: string }> {
  const userId = await requireAdminUserId();
  if (!userId) return { error: '로그인이 필요합니다.' };

  const service = getServiceSupabase();
  const { error } = await service
    .from('deepcheck_sessions')
    .update({ status: completed ? 'completed' : 'ready' })
    .eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/admin/deepcheck');
  return { ok: true };
}
