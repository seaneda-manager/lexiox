export const dynamic = 'force-dynamic';

// apps/web/app/api/activity/route.ts — 클라이언트 활동(페이지 이동 등) 기록
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '../../../lib/supabaseServer';

const ALLOWED_ACTIONS = new Set(['page_view']);

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const action = typeof body?.action === 'string' ? body.action : '';
  const path = typeof body?.path === 'string' ? body.path.slice(0, 500) : null;
  if (!ALLOWED_ACTIONS.has(action)) {
    return NextResponse.json({ error: 'invalid action' }, { status: 400 });
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    null;

  const { error } = await supabase.from('user_activity_log').insert({
    user_id: user.id,
    action,
    path,
    ip_address: ip,
    user_agent: req.headers.get('user-agent'),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
