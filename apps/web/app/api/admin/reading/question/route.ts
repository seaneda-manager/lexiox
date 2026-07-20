// UTF-8 (BOM 없음) 권장
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function guardAdmin() {
  const supabase = await getServerSupabase();

  const { data: { user }, error: uerr } = await supabase.auth.getUser();
  if (uerr) return { supabase, status: 500 as const, error: uerr.message };
  if (!user) return { supabase, status: 401 as const, error: 'unauthorized' };

  const { data: me, error: perr } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (perr) return { supabase, status: 500 as const, error: perr.message };
  if (!me || me.role !== 'admin') {
    // teacher도 허용하려면: if (!me || !['admin','teacher'].includes(me.role)) ...
    return { supabase, status: 403 as const, error: 'forbidden' };
  }
  return { supabase, status: 200 as const, error: null };
}

export async function PATCH(req: NextRequest) {
  const g = await guardAdmin();
  if (g.status !== 200) {
    return NextResponse.json({ error: g.error ?? 'forbidden' }, { status: g.status });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const { id, number, type, stem, explanation, clue_quote } = body ?? {};
  // number=0 도 유효할 수 있어 Number.isFinite 로 체크
  if (!id || !type || !stem || !Number.isFinite(Number(number))) {
    return NextResponse.json({ error: 'id, number, type, stem required' }, { status: 400 });
  }

  // 필요 시 타입 화이트리스트 검증
  const allowedTypes = new Set([
    'vocab','detail','negative_detail','paraphrasing',
    'insertion','inference','purpose','pronoun_ref',
    'summary','organization',
  ]);
  if (!allowedTypes.has(String(type))) {
    return NextResponse.json({ error: 'invalid question type' }, { status: 400 });
  }

  const { error } = await g.supabase
    .from('reading_questions')
    .update({
      number: Number(number),
      type: String(type),
      stem: String(stem),
      explanation: explanation ?? null,
      clue_quote: clue_quote ?? null,
    })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const g = await guardAdmin();
  if (g.status !== 200) {
    return NextResponse.json({ error: g.error ?? 'forbidden' }, { status: g.status });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const { id } = body ?? {};
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  // 🔁 스키마에 맞게 테이블명 확인!
  // - 개별 문제 답안을 question_id로 저장하는 테이블이 보통:
  //   'reading_answers'  또는  'user_reading_answers'
  const ANSWERS_TABLE = 'reading_answers'; // ← 실제 테이블명으로 바꿔도 됨

  // 이미 답안이 존재하면 물리 삭제 금지
  let answersCount = 0;
  {
    const { count, error: aErr } = await g.supabase
      .from(ANSWERS_TABLE)
      .select('*', { count: 'exact', head: true })
      .eq('question_id', id);

    if (!aErr) answersCount = count ?? 0;
    // 테이블이 없거나 에러면 보수적으로 0으로 간주(운영 상황 맞춰 조정 가능)
  }

  if (answersCount > 0) {
    return NextResponse.json(
      { error: 'answers exist; cannot delete question', conflict: true },
      { status: 409 }
    );
  }

  // 자식(choices) → 부모(questions) 순서로 삭제
  const { error: cDelErr } = await g.supabase
    .from('reading_choices')
    .delete()
    .eq('question_id', id);
  if (cDelErr) return NextResponse.json({ error: cDelErr.message }, { status: 400 });

  const { error: qDelErr } = await g.supabase
    .from('reading_questions')
    .delete()
    .eq('id', id);
  if (qDelErr) return NextResponse.json({ error: qDelErr.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
