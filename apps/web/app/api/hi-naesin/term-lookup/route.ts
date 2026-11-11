import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase, getServiceRoleClient } from '@/lib/supabase/server';
import { lookupTermWithAI, termKey, type TermKind } from '@/lib/hi-naesin/termTools';

export const dynamic = 'force-dynamic';

type Body = { term?: string; context?: string | null };

/** 하이라이트한 단어/구의 뜻·품사. 용어집 캐시 → words 사전(단어) → AI 순. */
export async function POST(req: NextRequest) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, message: 'unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Body;
  const term = (body.term ?? '').trim().replace(/\s+/g, ' ');
  const context = body.context?.trim().slice(0, 400) || null;
  const key = termKey(term);
  if (!term || !key || term.length > 60 || term.split(' ').length > 6) {
    return NextResponse.json({ ok: false, message: 'invalid term' }, { status: 400 });
  }

  // 1) 용어집 캐시
  const { data: gloss } = await supabase
    .from('hi_naesin_term_glossary')
    .select('lemma, kind, pos, meaning_ko')
    .eq('term_key', key)
    .maybeSingle();
  if (gloss?.meaning_ko) {
    return NextResponse.json({
      ok: true, source: 'glossary', term, lemma: gloss.lemma ?? key,
      kind: gloss.kind as TermKind, pos: gloss.pos ?? '-', meaningKo: gloss.meaning_ko,
    });
  }

  // 2) 기존 words 사전 (한 단어일 때만)
  if (!key.includes(' ')) {
    const { data: w } = await supabase
      .from('words')
      .select('lemma, pos, meanings_ko')
      .or(`text.ilike.${key},lemma.ilike.${key}`)
      .limit(1);
    const row = w?.[0];
    const ko = Array.isArray(row?.meanings_ko) ? (row!.meanings_ko as string[]).filter(Boolean).join(', ') : '';
    if (row && ko && row.pos) {
      return NextResponse.json({
        ok: true, source: 'dictionary', term, lemma: row.lemma ?? key,
        kind: 'word' as TermKind, pos: row.pos, meaningKo: ko,
      });
    }
  }

  // 3) AI (문맥 반영) + 캐시
  const ai = await lookupTermWithAI(term, context);
  if (!ai) return NextResponse.json({ ok: false, message: 'lookup failed' }, { status: 502 });
  try {
    await getServiceRoleClient().from('hi_naesin_term_glossary').upsert({
      term_key: key, lemma: ai.lemma, kind: ai.kind, pos: ai.pos, meaning_ko: ai.meaningKo,
    });
  } catch { /* 테이블 미적용 시 무시 */ }
  return NextResponse.json({ ok: true, source: 'ai', ...ai });
}
