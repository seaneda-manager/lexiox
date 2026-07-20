// apps/web/app/api/reading/finish/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const supabase = await getSupabaseServer(); // ? await

    // 인증
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr) return NextResponse.json({ ok: false, error: userErr.message }, { status: 500 });
    if (!user)   return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

    // 바디 파싱
    const { sessionId } = (await req.json()) as { sessionId?: string };
    const sid = (sessionId ?? '').trim(); // ? reading_sessions.id는 uuid
    if (!sid) return NextResponse.json({ ok: false, error: 'Missing sessionId' }, { status: 400 });

    // 내 세션만 종료
    const { data, error } = await supabase
      .from('reading_sessions')
      .update({ finished_at: new Date().toISOString() })
      .eq('id', sid)
      .eq('user_id', user.id)     // ? owner check
      .select('id');              // supabase-js v2: 두 번째 인자 없이

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    if (!data || data.length === 0) {
      return NextResponse.json({ ok: false, error: 'not found or forbidden' }, { status: 404 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}




