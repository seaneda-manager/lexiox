// apps/web/app/api/sessions/answer/route.ts (寃쎈줈 留욊쾶)
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

type Body = {
  sessionId?: string;
  questionId?: string | number;
  choiceId?: string | number;
  meta?: Record<string, unknown>;
};

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServer(); // ??await

  // 1) ?몄쬆
  const { data: { user }, error: uerr } = await supabase.auth.getUser();
  if (uerr)   return NextResponse.json({ error: uerr.message }, { status: 500 });
  if (!user)  return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // 2) ?낅젰 ?뚯떛/寃利?
  const body = (await req.json()) as Body;
  const sessionId = String(body.sessionId ?? '').trim();
  const questionId = String(body.questionId ?? '').trim();
  const choiceId   = String(body.choiceId ?? '').trim();
  const meta       = body.meta ?? null;

  if (!sessionId || !questionId || !choiceId) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  // 3) ?몄뀡 ?뚯쑀 ?뺤씤 (紐낆떆 媛??
  const { data: s, error: serr } = await supabase
    .from('study_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', user.id)        // ??owner check
    .maybeSingle();

  if (serr)     return NextResponse.json({ error: serr.message }, { status: 400 });
  if (!s)       return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  // 4) ?낆꽌??(session_id + question_id ?좊땲??
  const { error } = await supabase
    .from('study_answers')
    .upsert(
      {
        session_id: sessionId,
        question_id: questionId,
        choice_id: choiceId,
        meta,                         // json/jsonb 而щ읆
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'session_id,question_id' }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true }, { status: 200 });
}




