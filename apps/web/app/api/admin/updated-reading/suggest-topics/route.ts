export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getServiceSupabase } from '@/lib/supabase/service';
import { buildInspirationBlock } from '@/lib/topicPool';
import { collectUsedTopics, fetchTestPayloads } from '@/lib/topicPool/usedTopics';

export const runtime = 'nodejs';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'placeholder' });

type TopicKind = 'complete_words' | 'daily_life' | 'academic';

const ACADEMIC_FIELDS = ['astronomy', 'marine biology', 'ancient history', 'economics', 'linguistics', 'architecture', 'psychology', 'geology', 'music history', 'public health', 'anthropology', 'materials science', 'art history', 'ecology', 'philosophy of science', 'urban planning', 'agriculture', 'neuroscience', 'archaeology', 'sociology', 'meteorology', 'literature', 'robotics', 'nutrition science'];
const DAILY_FORMATS = ['email thread between neighbors', 'text-message chain among friends planning a trip', 'restaurant or cafe menu with prices', 'gym or club flyer', 'apartment listing', 'product warranty/return policy', 'bus or train timetable notice', 'social-media post from a local business', 'online store order confirmation', 'volunteer sign-up sheet', 'museum visitor guide', 'job posting for a part-time position'];

function pickFields(kind: TopicKind): string[] {
  const pool = kind === 'daily_life' ? DAILY_FORMATS : ACADEMIC_FIELDS;
  return [...pool].sort(() => Math.random() - 0.5).slice(0, 5);
}

async function suggestTopics(kind: TopicKind, existingTopics: string[]): Promise<string[]> {
  const kindLabel: Record<TopicKind, string> = {
    complete_words: 'a short academic paragraph used for a vocabulary/spelling cloze exercise',
    daily_life: 'a daily-life reading passage (campus notice, email, SNS post, or web article)',
    academic: 'a short TOEFL-style academic reading passage',
  };

  const prompt = `You are an expert TOEFL iBT Reading content creator. Generate 4-5 diverse, realistic topic ideas for ${kindLabel[kind]}.

Existing topics to avoid (must NOT be similar):
${existingTopics.length > 0 ? existingTopics.map(t => `- ${t}`).join('\n') : '(none)'}

Requirements:
- Each topic should be 3-8 words, specific and realistic
- Spread the ideas over these assigned fields (one idea per field): ${pickFields(kind).join('; ')}
- Make them diverse and interesting for college students
${kind === 'daily_life' ? '' : buildInspirationBlock('reading', 5, 'en', existingTopics)}
- Return ONLY a JSON array of strings, no markdown or explanations
- Example format: ["Library checkout system", "Coral reef bleaching", "Student housing lottery"]

Generate ${Math.max(4, 5 - existingTopics.length)} new topic suggestions:`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  try {
    // Claude가 ```json 펜스나 앞뒤 설명을 붙여도 배열만 뽑아 파싱한다.
    const m = content.text.match(/\[[\s\S]*\]/);
    const topics = JSON.parse(m ? m[0] : content.text);
    if (!Array.isArray(topics)) throw new Error('Expected array of topics');
    return topics.filter((t) => typeof t === 'string' && t.trim().length > 0);
  } catch {
    console.error('Failed to parse topics:', content.text);
    throw new Error('Failed to parse topic suggestions from Claude');
  }
}

export async function POST(req: Request) {
  try {
    const { kind, avoid } = (await req.json()) as { kind: string; avoid?: string[] };

    if (!['complete_words', 'daily_life', 'academic'].includes(kind)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid kind. Must be one of: complete_words, daily_life, academic' },
        { status: 400 }
      );
    }

    const sb = getServiceSupabase();

    // 전체 이력 장부(usedTopics + 실제 지문 제목) — 유형 구분 없이 모두 피한다.
    const existingTopics: string[] = collectUsedTopics(await fetchTestPayloads(sb, 'reading_tests_2026'), 150);

    if (Array.isArray(avoid)) {
      existingTopics.push(...avoid.filter((t): t is string => typeof t === 'string' && t.trim().length > 0));
    }

    const uniqueTopics = Array.from(new Set(existingTopics));

    const suggestions = await suggestTopics(kind as TopicKind, uniqueTopics);

    return NextResponse.json({ ok: true, suggestions, existingCount: uniqueTopics.length });
  } catch (err: any) {
    console.error('SUGGEST TOPICS ERROR:', err);
    return NextResponse.json({ ok: false, error: err?.message ?? 'Unknown error' }, { status: 500 });
  }
}
