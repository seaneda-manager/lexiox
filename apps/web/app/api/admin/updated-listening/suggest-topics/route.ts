export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getServiceSupabase } from '@/lib/supabase/service';

export const runtime = 'nodejs';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'placeholder' });

type TopicKind = 'conversation' | 'announcement' | 'lecture1' | 'lecture2';
type Bucket = 'conversation' | 'announcement' | 'lecture';
type Tier = 'module1' | 'hard' | 'easy';

const KIND_TO_BUCKET: Record<TopicKind, Bucket> = {
  conversation: 'conversation',
  announcement: 'announcement',
  lecture1: 'lecture',
  lecture2: 'lecture',
};

// DB에 저장된 기존 시험들에서 bucket(conversation/announcement/lecture)별로 이미 쓰인 주제 조회
async function getExistingTopicsByBucket(): Promise<Record<Bucket, string[]>> {
  const sb = getServiceSupabase();
  const { data: tests } = await sb.from('listening_tests_2026').select('payload');

  const result: Record<Bucket, string[]> = { conversation: [], announcement: [], lecture: [] };
  if (!tests) return result;

  for (const test of tests) {
    const payload = test.payload as any;
    for (const bucket of ['conversation', 'announcement', 'lecture'] as Bucket[]) {
      const used = payload?.meta?.usedTopics?.[bucket] as string[] | undefined;
      if (used) result[bucket].push(...used.filter(Boolean));
    }
    // 레거시 payload 호환
    if (payload?.meta) {
      if (payload.meta.conversationTopic) result.conversation.push(payload.meta.conversationTopic);
      if (payload.meta.announcementTopic) result.announcement.push(payload.meta.announcementTopic);
      if (payload.meta.lectureTopic1) result.lecture.push(payload.meta.lectureTopic1);
      if (payload.meta.lectureTopic2) result.lecture.push(payload.meta.lectureTopic2);
    }
  }
  return result;
}

async function callClaudeForTopics(prompt: string): Promise<any> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  try {
    return JSON.parse(content.text);
  } catch (e) {
    console.error('Failed to parse topics:', content.text);
    throw new Error('Failed to parse topic suggestions from Claude');
  }
}

// ── 기존: kind 단위(4가지) 개별 필드 추천 ──────────────────────────────

async function suggestTopics(kind: TopicKind, existingTopics: string[]): Promise<string[]> {
  const kindLabel: Record<TopicKind, string> = {
    conversation: 'Campus Conversation',
    announcement: 'Campus Announcement',
    lecture1: 'Academic Lecture',
    lecture2: 'Academic Lecture',
  };

  const prompt = `You are an expert TOEFL iBT Listening content creator. Generate 4-5 diverse, realistic topic ideas for "${kindLabel[kind]}".

Existing topics to avoid (must NOT be similar):
${existingTopics.length > 0 ? existingTopics.map(t => `- ${t}`).join('\n') : '(none)'}

Requirements:
- Each topic should be 3-8 words, specific and realistic
- Vary across different fields (STEM, humanities, social sciences, etc.)
- Make them diverse and interesting for college students
- Return ONLY a JSON array of strings, no markdown or explanations
- Example format: ["Library checkout system", "Climate change research", "Student wellness programs"]

Generate ${Math.max(4, 5 - existingTopics.length)} new topic suggestions:`;

  const topics = await callClaudeForTopics(prompt);
  if (!Array.isArray(topics)) {
    throw new Error('Expected array of topics');
  }
  return topics.filter((t) => typeof t === 'string' && t.trim().length > 0);
}

// ── 신규: tier 단위(module1/hard/easy) 일괄 추천 ───────────────────────
// 실제 문제 생성(generate/route.ts)이 module1/hard/easy 3그룹으로 나뉘어
// 서로 다른 프롬프트로 생성되는 것과 동일하게, 주제 추천도 그룹 단위로
// 한 번에 받아서 "전체 주제 자동채우기"가 필드별 순차 호출(최대 10회) 대신
// 3회 호출로 끝나도록 한다. Announcement는 Module 2 Hard/Easy가 공유하므로
// hard 호출에서 함께 받는다.

async function suggestTopicsForTier(
  tier: Tier,
  existingByBucket: Record<Bucket, string[]>
): Promise<{ conversation?: string[]; announcement?: string[]; lecture?: string[] }> {
  const avoidBlock = (bucket: Bucket) =>
    existingByBucket[bucket].length > 0
      ? existingByBucket[bucket].map((t) => `- ${t}`).join('\n')
      : '(none)';

  if (tier === 'module1') {
    const prompt = `You are an expert TOEFL iBT Listening content creator. This is for Module 1 (baseline, administered to all students).

Generate exactly ONE topic idea each for:
1. A campus Conversation
2. A campus Announcement
3. An Academic Lecture

Avoid topics similar to these already-used ones:
Conversation: ${avoidBlock('conversation')}
Announcement: ${avoidBlock('announcement')}
Lecture: ${avoidBlock('lecture')}

Requirements:
- Each topic should be 3-8 words, specific and realistic
- Suitable as a baseline-difficulty item (not too advanced)
- Return ONLY JSON, no markdown or explanation, in this exact shape:
{"conversation": "...", "announcement": "...", "lecture": "..."}`;

    const result = await callClaudeForTopics(prompt);
    return {
      conversation: result.conversation ? [result.conversation] : [],
      announcement: result.announcement ? [result.announcement] : [],
      lecture: result.lecture ? [result.lecture] : [],
    };
  }

  if (tier === 'hard') {
    const prompt = `You are an expert TOEFL iBT Listening content creator. This is for Module 2 - Hard branch (harder difficulty tier, shown to higher-scoring students).

Generate exactly TWO Academic Lecture topics and TWO Campus Announcement topics (the announcement topics are shared between the Hard and Easy branches).

Avoid topics similar to these already-used ones:
Lecture: ${avoidBlock('lecture')}
Announcement: ${avoidBlock('announcement')}

Requirements:
- Each topic should be 3-8 words, specific and realistic
- Lecture topics should be genuinely advanced/academic (STEM, humanities, social science)
- Vary the two lecture topics across different fields
- Return ONLY JSON, no markdown or explanation, in this exact shape:
{"lecture": ["...", "..."], "announcement": ["...", "..."]}`;

    const result = await callClaudeForTopics(prompt);
    return {
      lecture: Array.isArray(result.lecture) ? result.lecture.slice(0, 2) : [],
      announcement: Array.isArray(result.announcement) ? result.announcement.slice(0, 2) : [],
    };
  }

  // tier === 'easy'
  const prompt = `You are an expert TOEFL iBT Listening content creator. This is for Module 2 - Easy branch (easier difficulty tier, shown to lower-scoring students). Announcement topics for this branch are shared with the Hard branch and generated separately, so do NOT include announcements here.

Generate exactly THREE campus Conversation topics.

Avoid topics similar to these already-used ones:
Conversation: ${avoidBlock('conversation')}

Requirements:
- Each topic should be 3-8 words, specific and realistic
- Everyday campus-life scenarios (housing, registration, clubs, dining, etc.)
- Vary the three topics so they don't overlap in theme
- Return ONLY JSON, no markdown or explanation, in this exact shape:
{"conversation": ["...", "...", "..."]}`;

  const result = await callClaudeForTopics(prompt);
  return {
    conversation: Array.isArray(result.conversation) ? result.conversation.slice(0, 3) : [],
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      kind?: string;
      tier?: Tier;
      avoid?: string[];
    };

    const manualAvoid = Array.isArray(body.avoid)
      ? body.avoid.filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
      : [];

    // ── tier 단위(module1/hard/easy) 일괄 추천 ──
    if (body.tier) {
      if (!['module1', 'hard', 'easy'].includes(body.tier)) {
        return NextResponse.json(
          { ok: false, error: 'Invalid tier. Must be one of: module1, hard, easy' },
          { status: 400 }
        );
      }

      const existingByBucket = await getExistingTopicsByBucket();
      for (const bucket of ['conversation', 'announcement', 'lecture'] as Bucket[]) {
        existingByBucket[bucket] = Array.from(
          new Set([...existingByBucket[bucket], ...manualAvoid])
        );
      }

      const topics = await suggestTopicsForTier(body.tier, existingByBucket);
      return NextResponse.json({ ok: true, tier: body.tier, topics });
    }

    // ── 기존: kind 단위 개별 필드 추천 ──
    const { kind } = body;
    if (!kind || !['conversation', 'announcement', 'lecture1', 'lecture2'].includes(kind)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid kind. Must be one of: conversation, announcement, lecture1, lecture2' },
        { status: 400 }
      );
    }

    const existingByBucket = await getExistingTopicsByBucket();
    const bucket = KIND_TO_BUCKET[kind as TopicKind];
    const uniqueTopics = Array.from(new Set([...existingByBucket[bucket], ...manualAvoid]));

    const suggestions = await suggestTopics(kind as TopicKind, uniqueTopics);

    return NextResponse.json({
      ok: true,
      suggestions,
      existingCount: uniqueTopics.length,
    });
  } catch (err: any) {
    console.error('SUGGEST TOPICS ERROR:', err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}
