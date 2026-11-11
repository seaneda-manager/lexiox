import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';
import { termKey } from '@/lib/hi-naesin/termTools';

export const dynamic = 'force-dynamic';

const KINDS = ['word', 'phrase', 'phrasal_verb', 'idiom', 'term'];

/** 학생 단어장 (RLS: 본인 행만). 테이블이 아직 없으면 available:false → 클라이언트는 localStorage 로 동작. */
export async function GET(req: NextRequest) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  const passageId = req.nextUrl.searchParams.get('passageId');
  let q = supabase
    .from('hi_naesin_student_words')
    .select('id, term, term_key, lemma, kind, pos, meaning_ko, context_sentence, source, passage_id, created_at')
    .eq('student_id', user.id)
    .order('created_at', { ascending: false })
    .limit(500);
  if (passageId) q = q.eq('passage_id', passageId);
  const { data, error } = await q;
  if (error) return NextResponse.json({ ok: true, available: false, items: [] });
  return NextResponse.json({ ok: true, available: true, items: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const term = typeof b.term === 'string' ? b.term.trim() : '';
  const key = termKey(term);
  if (!term || !key) return NextResponse.json({ ok: false, message: 'invalid term' }, { status: 400 });
  const row = {
    student_id: user.id,
    passage_id: typeof b.passageId === 'string' ? b.passageId : null,
    term,
    term_key: key,
    lemma: typeof b.lemma === 'string' ? b.lemma : null,
    kind: KINDS.includes(b.kind as string) ? (b.kind as string) : 'word',
    pos: typeof b.pos === 'string' ? b.pos : null,
    meaning_ko: typeof b.meaningKo === 'string' ? b.meaningKo : null,
    context_sentence: typeof b.context === 'string' ? b.context.slice(0, 400) : null,
    source: b.source === 'key_term' ? 'key_term' : 'highlight',
  };
  const { error } = await supabase.from('hi_naesin_student_words').upsert(row, { onConflict: 'student_id,term_key' });
  if (error) return NextResponse.json({ ok: true, available: false });
  return NextResponse.json({ ok: true, available: true });
}

export async function DELETE(req: NextRequest) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  const key = termKey(req.nextUrl.searchParams.get('term') ?? '');
  if (!key) return NextResponse.json({ ok: false }, { status: 400 });
  const { error } = await supabase.from('hi_naesin_student_words').delete().eq('student_id', user.id).eq('term_key', key);
  return NextResponse.json({ ok: !error });
}
