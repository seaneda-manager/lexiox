// apps/web/app/api/sessions/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await getSupabaseServer();

  // 인증
  const { data: { user }, error: uerr } = await supabase.auth.getUser();
  if (uerr) return NextResponse.json({ error: uerr.message }, { status: 500 });
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // 소유자 가드 (존재 + 내 세션)
  const { data: s, error: serr } = await supabase
    .from('study_sessions')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (serr) return NextResponse.json({ error: serr.message }, { status: 400 });
  if (!s)   return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  // 종료 처리 (owner 조건을 업데이트에도 걸기)
  const { data, error } = await supabase
    .from('study_sessions')
    .update({ finished_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('finished_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: 'not found' }, { status: 404 });

  return NextResponse.json({ ok: true, finishedAt: data.finished_at }, { status: 200 });
}
