// apps/web/app/api/updated-reading/study/submit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

type Body = {
  setId: string;                    // reading_sets.id (text)
  answers: Record<string, string>;  // {questionId: choiceId}
  unknownVocab?: string[];          // ["derive", "allocate"]
};

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
    error: uerr,
  } = await supabase.auth.getUser();

  if (uerr) {
    return NextResponse.json({ ok: false, error: uerr.message }, { status: 500 });
  }
  if (!user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body || typeof body.setId !== 'string' || typeof body.answers !== 'object') {
    return NextResponse.json({ ok: false, error: 'Invalid payload' }, { status: 400 });
  }

  const { setId, answers, unknownVocab = [] } = body;

  // 1) 정답 정보 읽어오기
  const { data: qs, error: qerr } = await supabase
    .from('reading_questions')
    .select('id, choices')
    .eq('set_id', setId);

  if (qerr) {
    return NextResponse.json({ ok: false, error: qerr.message }, { status: 500 });
  }

  const incorrect: string[] = [];
  const questions = (qs ?? []) as { id: string; choices: any }[];

  for (const q of questions) {
    const picked = answers[q.id];
    if (!picked) {
      incorrect.push(q.id);
      continue;
    }
    const choices = Array.isArray(q.choices) ? q.choices : [];
    const correct = choices.find((c: any) => c.is_correct);
    if (!correct || picked !== correct.id) {
      incorrect.push(q.id);
    }
  }

  // 2) study_sessions insert
  const { data: session, error: serr } = await supabase
    .from('study_sessions')
    .insert({
      user_id: user.id,
      set_id: setId,
      answers,
      incorrect,
      unknown_vocab: unknownVocab,
    })
    .select('id')
    .single();

  if (serr || !session) {
    return NextResponse.json(
      { ok: false, error: serr?.message ?? 'session insert failed' },
      { status: 500 }
    );
  }

  const sessionId = session.id as string;

  return NextResponse.json({ ok: true, sessionId });
}
