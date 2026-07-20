// apps/web/app/api/listening/answer/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServer();

  // 1) Authenticate user
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) {
    return NextResponse.json({ error: userErr.message }, { status: 500 });
  }
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // 2) Validate request body
  const { sessionId, questionId, choiceId } = (await req.json()) as {
    sessionId?: string;
    questionId?: string;
    choiceId?: string | null;
  };

  if (!sessionId || !questionId) {
    return NextResponse.json(
      { error: 'sessionId & questionId required' },
      { status: 400 }
    );
  }

  // 3) Check whether this session belongs to the current user
  const { data: own, error: ownErr } = await supabase
    .from('listening_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (ownErr) {
    return NextResponse.json({ error: ownErr.message }, { status: 400 });
  }
  if (!own) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // 4) Upsert answer and update updated_at
  //    user_id is filled automatically by the DB trigger (fill_answer_user_id)
  const { error } = await supabase.from('listening_answers').upsert(
    {
      session_id: sessionId,
      question_id: questionId,
      choice_id: choiceId ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'session_id,question_id' }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}