// UTF-8 (BOM 없음) 권장
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();

    // 1) 인증/권한
    const { data: { user }, error: uerr } = await supabase.auth.getUser();
    if (uerr) return NextResponse.json({ error: uerr.message }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });

    const { data: me, error: perr } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle(); // ← single() 대신 안전
    if (perr) return NextResponse.json({ error: perr.message }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
    if (!me || !['admin', 'teacher'].includes(me.role)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
    }

    // 2) 검색어
    const url = new URL(req.url);
    const q = (url.searchParams.get('q') ?? '').trim();

    // 3) passages
    let pquery = supabase
      .from('reading_passages')
      .select('id, set_id, title, content, created_at') // created_at 포함
      .order('created_at', { ascending: false })        // ← updated_at 대신 created_at 사용
      .limit(50);

    if (q) {
      pquery = pquery.or(`title.ilike.%${q}%,set_id.ilike.%${q}%`);
    }

    const { data: passages, error: pErr } = await pquery;
    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
    if (!passages?.length) return NextResponse.json({ items: [] }, { headers: { 'Cache-Control': 'no-store' } });

    // 4) questions
    const passageIds = passages.map((p) => p.id);
    const { data: questions, error: qErr } = await supabase
      .from('reading_questions')
      .select('id, passage_id, number, type, stem, explanation, clue_quote')
      .in('passage_id', passageIds)
      .order('number', { ascending: true });
    if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500, headers: { 'Cache-Control': 'no-store' } });

    // 5) choices
    const qIds = (questions ?? []).map((r) => r.id);
    const { data: choices, error: cErr } = qIds.length
      ? await supabase
          .from('reading_choices')
          .select('id, question_id, text, is_correct')
          .in('question_id', qIds)
          .order('id', { ascending: true })
      : { data: [], error: null };
    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500, headers: { 'Cache-Control': 'no-store' } });

    // 6) (선택) 답안 통계 뷰: 없으면 0으로 유지
    const answersCount: Record<string, number> = {};
    for (const id of passageIds) answersCount[id] = 0;
    if (passageIds.length) {
      const { data: ac, error: acErr } = await supabase
        .from('answers_count_by_passage')
        .select('passage_id, answers')
        .in('passage_id', passageIds);

      if (!acErr && ac?.length) {
        for (const r of ac) answersCount[r.passage_id] = r.answers;
      }
    }

    // 7) assemble
    const qByPassage: Record<string, any[]> = {};
    for (const id of passageIds) qByPassage[id] = [];
    for (const qn of (questions ?? [])) qByPassage[qn.passage_id].push({ ...qn, choices: [] });

    const cByQ: Record<string, any[]> = {};
    for (const id of qIds) cByQ[id] = [];
    for (const ch of (choices ?? [])) (cByQ[ch.question_id] ??= []).push(ch);

    const items = passages.map((p) => ({
      id: p.id,
      set_id: p.set_id,
      title: p.title,
      content: p.content ?? '',
      stats: { answers: answersCount[p.id] ?? 0 },
      questions: (qByPassage[p.id] ?? []).map((qn) => ({
        ...qn,
        choices: cByQ[qn.id] ?? [],
      })),
    }));

    return NextResponse.json({ items }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'internal error' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
