// apps/web/app/api/sessions/[id]/summary/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // ← Next 15: params는 Promise
  const sessionId = (id ?? '').trim();

  const supabase = await getSupabaseServer();

  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 });
  if (!user)   return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // 오너 검증 포함 조회
  const { data: row, error } = await supabase
    .from('v_session_score')
    .select('*')
    .eq('session_id', sessionId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!row)  return NextResponse.json({ error: 'not found' }, { status: 404 });

  return NextResponse.json(row, { status: 200 });
}
