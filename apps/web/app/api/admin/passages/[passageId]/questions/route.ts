// apps/web/app/api/admin/passages/[passageId]/questions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

type QuestionChoiceInput = {
  id?: string;
  text: string;
  is_correct?: boolean;
};

type QuestionInput = {
  id?: string;
  number: number;
  stem: string;
  type?: string;
  meta?: unknown;
  explanation?: string | null;
  clue_quote?: string | null;
  choices?: QuestionChoiceInput[];
};

type PatchBody = {
  questions: QuestionInput[];
};

/** GET /api/admin/passages/[passageId]/questions */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ passageId: string }> }
) {
  const { passageId } = await params;
  const supabase = await getSupabaseServer();

  const { data, error } = await supabase
    .from('reading_questions')
    .select('*, choices:reading_choices(*)')
    .eq('passage_id', passageId)
    .order('number', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

/** PATCH /api/admin/passages/[passageId]/questions */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ passageId: string }> }
) {
  const { passageId } = await params;
  const supabase = await getSupabaseServer();

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch (err) {
    return NextResponse.json(
      { error: 'Invalid JSON body', detail: String(err) },
      { status: 400 }
    );
  }

  const questions = Array.isArray(body.questions) ? body.questions : [];

  // 질문 upsert
  const upsertPayload = questions.map((q) => ({
    id: q.id,
    passage_id: passageId,
    number: q.number,
    stem: q.stem,
    type: q.type ?? 'detail',
    meta: q.meta ?? null,
    explanation: q.explanation ?? null,
    clue_quote: q.clue_quote ?? null,
  }));

  if (upsertPayload.length > 0) {
    const { error: qErr } = await supabase
      .from('reading_questions')
      .upsert(upsertPayload, { onConflict: 'id' });

    if (qErr) {
      return NextResponse.json(
        { error: `Question upsert failed: ${qErr.message}` },
        { status: 500 }
      );
    }
  }

  // choice upsert (id 기준, 삭제 로직은 나중에 추가 가능)
  const allChoices: (QuestionChoiceInput & { question_id: string })[] = [];
  for (const q of questions) {
    if (!q.id || !q.choices) continue;
    for (const c of q.choices) {
      allChoices.push({
        ...c,
        question_id: q.id,
      });
    }
  }

  if (allChoices.length > 0) {
    const { error: cErr } = await supabase
      .from('reading_choices')
      .upsert(
        allChoices.map((c) => ({
          id: c.id,
          question_id: c.question_id,
          text: c.text,
          is_correct: !!c.is_correct,
        })),
        { onConflict: 'id' }
      );

    if (cErr) {
      return NextResponse.json(
        { error: `Choice upsert failed: ${cErr.message}` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    ok: true,
    passageId,
    updatedQuestions: questions.length,
    updatedChoices: allChoices.length,
  });
}
