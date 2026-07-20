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

  // admin 전용(teacher도 허용하려면 배열에 'teacher' 추가)
  const { data: me, error: perr } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (perr) return { supabase, status: 500 as const, error: perr.message };
  if (!me || me.role !== 'admin') {
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

  const { id, title, content, set_id } = body ?? {};
  if (!id || !title || !content || !set_id) {
    return NextResponse.json({ error: 'id,title,content,set_id required' }, { status: 400 });
  }

  const { error } = await g.supabase
    .from('reading_passages')
    .update({ title, content, set_id })
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

  // 1) 이 passage의 question id 목록
  const { data: qs, error: qErr } = await g.supabase
    .from('reading_questions')
    .select('id')
    .eq('passage_id', id);

  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 400 });

  const qids = (qs ?? []).map(r => r.id);

  // 2) 이미 제출된 답안이 있으면 물리삭제 대신 보관(archived)
  //    스키마에 따라 'reading_answers' 또는 'user_reading_answers' 이름을 사용
  let answersCount = 0;
  if (qids.length) {
    const { count, error: aErr } = await g.supabase
      .from('reading_answers') // ← 스키마에 맞게 테이블명 확인
      .select('*', { count: 'exact', head: true })
      .in('question_id', qids);

    if (aErr) {
      // 답안 테이블이 없으면 보수적으로 0으로 간주
      answersCount = 0;
    } else {
      answersCount = count ?? 0;
    }
  }

  if (answersCount > 0) {
    // 하드딜리트 금지: set_id를 archived:TIMESTAMP 로 바꿔 보관
    const { error: arcErr } = await g.supabase
      .from('reading_passages')
      .update({ set_id: `archived:${Date.now()}` })
      .eq('id', id);

    if (arcErr) return NextResponse.json({ error: arcErr.message }, { status: 400 });
    return NextResponse.json({ ok: true, archived: true });
  }

  // 3) 제출 답안이 없으면 하드딜리트(choices → questions → passage)
  if (qids.length) {
    const { error: cDelErr } = await g.supabase
      .from('reading_choices')
      .delete()
      .in('question_id', qids);
    if (cDelErr) return NextResponse.json({ error: cDelErr.message }, { status: 400 });

    const { error: qDelErr } = await g.supabase
      .from('reading_questions')
      .delete()
      .in('id', qids);
    if (qDelErr) return NextResponse.json({ error: qDelErr.message }, { status: 400 });
  }

  const { error: pDelErr } = await g.supabase
    .from('reading_passages')
    .delete()
    .eq('id', id);
  if (pDelErr) return NextResponse.json({ error: pDelErr.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
