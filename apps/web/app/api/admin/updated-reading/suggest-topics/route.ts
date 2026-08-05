export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getServiceSupabase } from '@/lib/supabase/service';

export const runtime = 'nodejs';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'placeholder' });

type TopicKind = 'complete_words' | 'daily_life' | 'academic';

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
- Vary across different fields (STEM, humanities, social sciences, campus life, etc.)
- Make them diverse and interesting for college students
- Return ONLY a JSON array of strings, no markdown or explanations
- Example format: ["Library checkout system", "Coral reef bleaching", "Student housing lottery"]

Generate ${Math.max(4, 5 - existingTopics.length)} new topic suggestions:`;

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-1-20250805',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  try {
    const topics = JSON.parse(content.text);
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

    const { data: tests } = await sb.from('reading_tests_2026').select('payload');

    const existingTopics: string[] = [];
    if (tests) {
      for (const test of tests) {
        const payload = test.payload as any;
        const used = payload?.meta?.usedTopics?.[kind] as string[] | undefined;
        if (used) existingTopics.push(...used.filter(Boolean));
      }
    }

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
