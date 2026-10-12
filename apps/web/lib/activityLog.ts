import { headers } from 'next/headers';
import { getSupabaseServer } from '@/lib/supabaseServer';

/** 서버 액션/라우트에서 사용자 활동을 user_activity_log에 남긴다. 실패해도 본 작업에는 영향 없음. */
export async function logActivity(
  action: string,
  opts: { path?: string; metadata?: Record<string, unknown> } = {}
): Promise<void> {
  try {
    const supabase = await getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const h = await headers();
    await supabase.from('user_activity_log').insert({
      user_id: user.id,
      action,
      path: opts.path ?? null,
      metadata: opts.metadata ?? {},
      ip_address: h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || null,
      user_agent: h.get('user-agent'),
    });
  } catch (e) {
    console.error('[activity_log] insert failed:', e);
  }
}
