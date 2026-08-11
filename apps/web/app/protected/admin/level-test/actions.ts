'use server';

import { revalidatePath } from 'next/cache';
import { getServerSupabase } from '@/lib/supabase/server';
import { getServiceSupabase } from '@/lib/supabase/service';

export async function setRecommendedLevelAction(
  sessionId: string,
  recommendedLevel: string,
  teacherNotes: string,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  const service = getServiceSupabase();
  const { error } = await service
    .from('level_test_sessions')
    .update({ recommended_level: recommendedLevel.trim() || null, teacher_notes: teacherNotes.trim() || null })
    .eq('id', sessionId);
  if (error) return { error: error.message };

  revalidatePath('/admin/level-test');
  return { ok: true };
}
