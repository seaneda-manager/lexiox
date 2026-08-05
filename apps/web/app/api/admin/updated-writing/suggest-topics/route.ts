export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getServiceSupabase } from '@/lib/supabase/service';

export const runtime = 'nodejs';
export const maxDuration = 30;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'placeholder' });

type Bucket = 'build_sentence' | 'email' | 'academic';

const BUCKETS: Bucket[] = ['build_sentence', 'email', 'academic'];

// AI 호출이 실패했을 때만 쓰는 폴백.
const FALLBACK: Record<Bucket, string[]> = {
  build_sentence: ['수강신청 문의', '기숙사 룸메이트와의 대화', '도서관 자료 대출'],
  email: ['과제 제출 기한 연장 요청', '교수님께 면담 요청', '수강 철회 문의'],
  academic: ['온라인 교육의 장점과 단점', '대학 등록금 지원 정책', '캠퍼스 내 자동차 통행 제한'],
};

const KIND_LABEL: Record<Bucket, string> = {
  build_sentence:
    'the shared everyday situation behind 10 short Build-a-Sentence items (the student rearranges words and phrases into one sentence per item, so the situation must produce many short conversational sentences)',
  email:
    'a situation in which a student must write a short email to a professor or a university office (there must be a concrete request or problem to communicate)',
  academic:
    'an academic discussion question a professor would post for students to argue a position on',
};

/** 저장된 모든 Writing 시험에서 이미 소비한 주제를 모은다. */
async function collectUsedTopics(bucket: Bucket): Promise<string[]> {
  const sb = getServiceSupabase();
  const { data, error } = await sb.from('writing_tests').select('payload');
  if (error) throw error;

  const used: string[] = [];
  for (const row of data ?? []) {
    const payload = row.payload as any;

    const recorded = payload?.meta?.usedTopics?.[bucket] as string[] | undefined;
    if (recorded) {
      used.push(...recorded.filter(Boolean));
      continue;
    }

    // 레거시: usedTopics가 없던 시절 저장분은 페이로드에서 되짚어낸다.
    const items = payload?.items ?? [];
    if (bucket === 'email') {
      const email = items.find((i: any) => i.taskKind === 'email');
      if (email?.subjectLine) used.push(email.subjectLine);
    } else if (bucket === 'academic') {
      const ac = items.find((i: any) => i.taskKind === 'academic_discussion');
      if (ac?.professorPrompt) used.push(ac.professorPrompt);
    } else {
      const bs = items.find((i: any) => i.taskKind === 'build_a_sentence');
      if (bs?.instruction) used.push(bs.instruction);
    }
  }
  return Array.from(new Set(used));
}

async function suggest(bucket: Bucket, existing: string[], count: number): Promise<string[]> {
  const prompt = `You are an expert Updated TOEFL Writing content creator. Suggest ${count} topic ideas for ${KIND_LABEL[bucket]}.

Topics already used (yours must NOT be similar to any of these):
${existing.length ? existing.map((t) => `- ${t}`).join('\n') : '(none)'}

Requirements:
- Write each topic in Korean as a short phrase, to match the existing set
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
  const bucket = (searchParams.get('bucket') ?? 'email') as Bucket;

  if (!BUCKETS.includes(bucket)) {
    return NextResponse.json(
      { ok: false, error: `Invalid bucket. Must be one of: ${BUCKETS.join(', ')}` },
      { status: 400 },
    );
  }

  const count = bucket === 'build_sentence' ? 4 : 3;

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
    console.error('WRITING SUGGEST TOPICS ERROR:', e);
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
