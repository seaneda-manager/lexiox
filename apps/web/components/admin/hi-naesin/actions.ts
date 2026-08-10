'use server';

import { revalidatePath } from 'next/cache';
import { getServerSupabase } from '@/lib/supabase/server';
import { getServiceSupabase } from '@/lib/supabase/service';

export async function markWrongAnswerReviewedAction(
  responseId: string,
  revalidateTargetPath: string,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  const service = getServiceSupabase();
  const { error } = await service
    .from('hi_naesin_drill_responses')
    .update({ reviewed_at: new Date().toISOString(), reviewed_by: user.id })
    .eq('id', responseId);

  if (error) return { error: error.message };

  revalidatePath(revalidateTargetPath);
  return { ok: true };
}
