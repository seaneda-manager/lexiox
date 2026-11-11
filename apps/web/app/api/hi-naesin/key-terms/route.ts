import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase, getServiceRoleClient } from '@/lib/supabase/server';
import { extractKeyTerms, type KeyTerm } from '@/lib/hi-naesin/termTools';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// 같은 지문에 대한 동시 요청은 AI 호출 1회를 공유 (dev 이중 마운트·여러 학생 동시 진입 방지)
const inflight = new Map<string, Promise<KeyTerm[]>>();

/** 지문 핵심 어휘(단어·구동사·관용구·구·전문용어). 캐시가 있으면 반환, 없으면 AI로 1회 취합 후 저장. */
export async function GET(req: NextRequest) {
  const passageId = req.nextUrl.searchParams.get('passageId');
  if (!passageId) return NextResponse.json({ ok: false, message: 'passageId required' }, { status: 400 });

  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, message: 'unauthorized' }, { status: 401 });

  // 1) 캐시 (테이블이 아직 없으면 error → 그냥 생성 경로로)
  const { data: cached, error: cacheErr } = await supabase
    .from('hi_naesin_passage_terms')
    .select('items')
    .eq('passage_id', passageId)
    .maybeSingle();
  if (!cacheErr && cached && Array.isArray(cached.items) && cached.items.length > 0) {
    return NextResponse.json({ ok: true, items: cached.items as KeyTerm[], cached: true });
  }

  // 2) 생성
  const { data: passage } = await supabase
    .from('hi_naesin_passages')
    .select('title, passage_text, grade')
    .eq('id', passageId)
    .single();
  if (!passage) return NextResponse.json({ ok: false, message: 'passage not found' }, { status: 404 });

  try {
    let job = inflight.get(passageId);
    if (!job) {
      job = extractKeyTerms({
        passageText: passage.passage_text,
        title: passage.title,
        grade: passage.grade,
      }).finally(() => inflight.delete(passageId));
      inflight.set(passageId, job);
    }
    const items = await job;
    let persisted = false;
    if (items.length > 0) {
      try {
        const { error } = await getServiceRoleClient()
          .from('hi_naesin_passage_terms')
          .upsert({ passage_id: passageId, items, model: 'claude-haiku-4-5', generated_at: new Date().toISOString() });
        persisted = !error;
      } catch { /* 테이블 미적용 시 무시 */ }
    }
    return NextResponse.json({ ok: true, items, cached: false, persisted });
  } catch (e) {
    console.error('[hi-naesin.key-terms]', e);
    return NextResponse.json({ ok: false, message: 'extract failed' }, { status: 500 });
  }
}
