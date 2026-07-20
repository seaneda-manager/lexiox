// apps/web/app/api/listening/submit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const supabase = await getSupabaseServer(); // ? await

    // 바디 파싱/검증
    const body = (await req.json()) as {
      sessionId?: string;       // uuid
      questionId?: number;      // bigint
      choiceId?: string;
      elapsedMs?: number | null;
    };

    const sessionId = String(body.sessionId ?? '').trim();
    const questionId = Number(body.questionId);
    const choiceId = String(body.choiceId ?? '').trim();
    const elapsedMs =
      body.elapsedMs === null || body.elapsedMs === undefined
        ? null
        : Number(body.elapsedMs);

    if (!sessionId || !Number.isFinite(questionId) || !choiceId) {
      return NextResponse.json({ ok: false, error: 'Missing or invalid fields' }, { status: 400 });
    }

    // 인증 + 소유자 가드: 내 세션에만 답변 가능
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr) return NextResponse.json({ ok: false, error: userErr.message }, { status: 500 });
    if (!user)   return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

    const { data: sess, error: sessErr } = await supabase
      .from('listening_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (sessErr) return NextResponse.json({ ok: false, error: sessErr.message }, { status: 400 });
    if (!sess)   return NextResponse.json({ ok: false, error: 'not found or forbidden' }, { status: 404 });

    // 저장 (session_id + question_id 기준 upsert)
    const { error } = await supabase
      .from('listening_answers')
      .upsert(
        {
          session_id: sessionId,          // uuid
          question_id: questionId,        // bigint
          choice_id: choiceId,
          elapsed_ms: elapsedMs,
        },
        { onConflict: 'session_id,question_id' }
      );

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}




