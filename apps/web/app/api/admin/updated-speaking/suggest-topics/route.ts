export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getServiceSupabase } from '@/lib/supabase/service';

export const runtime = 'nodejs';
export const maxDuration = 30;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'placeholder' });

type Bucket = 'listen_repeat' | 'interview';

const BUCKETS: Bucket[] = ['listen_repeat', 'interview'];

// AI 호출이 실패했을 때만 쓰는 폴백. 정상 경로에서는 쓰지 않는다.
const FALLBACK: Record<Bucket, string[]> = {
  listen_repeat: ['도서관 이용 안내', '기숙사 생활 조언', '캠퍼스 투어', '수강신청 절차'],
  interview: ['온라인 교육의 장점과 단점', '기술이 인간관계에 미치는 영향', '전통문화의 보존'],
};

const KIND_LABEL: Record<Bucket, string> = {
  listen_repeat:
    'a realistic campus or everyday situation for a Listen-and-Repeat task (the student repeats sentences someone in that situation would say)',
  interview:
    'an open-ended opinion topic for a spoken interview task (the student answers 4 questions of increasing depth)',
};

/** 저장된 모든 Speaking 시험에서 이미 소비한 주제를 모은다. */
async function collectUsedTopics(bucket: Bucket): Promise<string[]> {
  const sb = getServiceSupabase();
  const { data, error } = await sb.from('speaking_tests').select('payload');
  if (error) throw error;

  const used: string[] = [];
  for (const row of data ?? []) {
    const payload = row.payload as any;

    // 신규: 생성 시 기록한 usedTopics
    const recorded = payload?.usedTopics?.[bucket] as string[] | undefined;
    if (recorded) used.push(...recorded.filter(Boolean));

    // 레거시: usedTopics가 없던 시절 저장분은 페이로드에서 되짚어낸다.
    if (!recorded) {
      if (bucket === 'interview') {
        const interview = payload?.tasks?.find((t: any) => t.type === 'interview');
        const topic = interview?.questions?.[0]?.topic;
        if (topic) used.push(topic);
      } else {
        const lr = payload?.tasks?.find((t: any) => t.type === 'listen_repeat');
        if (lr?.situation) used.push(lr.situation);
      }
    }
  }
  return Array.from(new Set(used));
}

async function suggest(bucket: Bucket, existing: string[], count: number): Promise<string[]> {
  const prompt = `You are an expert Updated TOEFL Speaking content creator. Suggest ${count} topic ideas for ${KIND_LABEL[bucket]}.

Topics already used (yours must NOT be similar to any of these):
${existing.length ? existing.map((t) => `- ${t}`).join('\n') : '(none)'}

Requirements:
- Write each topic in Korean, 3-10 characters or a short Korean phrase, to match the existing set
- Each topic must be specific enough to generate content from, not a broad category
- Vary the situations and domains; do not cluster around one theme
- Return ONLY a JSON array of strings, no markdown, no explanation`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude');

  const start = content.text.indexOf('[');
  const end = content.text.lastIndexOf(']');
  const topics = JSON.parse(content.text.slice(start, end + 1));
  if (!Array.isArray(topics)) throw new Error('Expected array of topics');

  return topics.filter((t): t is string => typeof t === 'string' && t.trim().length > 0);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const bucket = (searchParams.get('bucket') ?? 'interview') as Bucket;

  if (!BUCKETS.includes(bucket)) {
    return NextResponse.json(
      { ok: false, error: `Invalid bucket. Must be one of: ${BUCKETS.join(', ')}` },
      { status: 400 },
    );
  }

  // listen_repeat은 하나만 자동 선택, interview는 고를 수 있게 여러 개.
  const count = bucket === 'listen_repeat' ? 4 : 3;

  try {
    const existing = await collectUsedTopics(bucket);
    const suggestions = await suggest(bucket, existing, count);

    return NextResponse.json({
      ok: true,
      suggestions,
      topic: suggestions[0],
      recommended: suggestions[0],
      existingCount: existing.length,
    });
  } catch (e: any) {
    // 주제 추천이 막혀서 시험 생성 자체를 못 하게 되는 건 과한 실패다.
    // 폴백을 주되 어떤 경로로 왔는지는 알려준다.
    console.error('SPEAKING SUGGEST TOPICS ERROR:', e);
    const fallback = FALLBACK[bucket].slice(0, count);
    return NextResponse.json({
      ok: true,
      fallback: true,
      error: e?.message ?? 'Unknown error',
      suggestions: fallback,
      topic: fallback[0],
      recommended: fallback[0],
      existingCount: 0,
    });
  }
}
