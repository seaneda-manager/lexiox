// apps/web/app/api/reading/consume/route.ts
export const runtime = 'nodejs';

import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer } from '@/lib/supabaseServer';

const BodySchema = z.object({
  // ? reading_sessions.id가 uuid인 스키마 기준
  sessionId: z.string().uuid(),
  passageId: z.string().min(1), // 필요하다면 .uuid()로 바꾸세요
  mode: z.enum(['p', 't', 'r', 'test', 'study']).default('t'),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await getSupabaseServer(); // ? await

    // 0) 인증
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr) return NextResponse.json({ ok: false, error: userErr.message }, { status: 500 });
    if (!user)   return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });

    // 1) 바디 파싱(JSON 우선, x-www-form-urlencoded 폴백)
    const ct = req.headers.get('content-type') ?? '';
    let payload: unknown;
    if (ct.includes('application/json')) {
      payload = await req.json();
    } else {
      const raw = await req.text();
      try { payload = JSON.parse(raw); }
      catch { payload = Object.fromEntries(new URLSearchParams(raw).entries()); }
    }

    const { sessionId, passageId, mode } = BodySchema.parse(payload);

    // 2) 내 세션만 소비 처리 (소유자 가드)
    const { data, error } = await supabase
      .from('reading_sessions')
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', sessionId)
      .eq('user_id', user.id)              // ? owner check
      // .is('consumed_at', null)           // (선택) 이미 소비된 건 막고 싶으면 주석 해제
      .select('id, consumed_at')
      .single();

    if (error) return NextResponse.json({ ok: false, error: 'DB_ERROR', detail: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 });

    // 3) (선택) 소비 로그 남기기
    // await supabase.from('reading_plays').insert({ session_id: sessionId, passage_id: passageId, mode });

    return NextResponse.json({ ok: true, session: data }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: 'INTERNAL', detail: String(err?.message ?? err) }, { status: 500 });
  }
}




