import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getServiceSupabase } from '@/lib/supabase/service';

export const runtime = 'nodejs';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'placeholder' });

type TopicKind = 'conversation' | 'announcement' | 'lecture1' | 'lecture2';

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

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-1-20250805',
    max_tokens: 500,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  try {
    const topics = JSON.parse(content.text);
    if (!Array.isArray(topics)) {
      throw new Error('Expected array of topics');
    }
    return topics.filter(t => typeof t === 'string' && t.trim().length > 0);
  } catch (e) {
    console.error('Failed to parse topics:', content.text);
    throw new Error('Failed to parse topic suggestions from Claude');
  }
}

export async function POST(req: Request) {
  try {
    const { kind, avoid } = await req.json() as { kind: string; avoid?: string[] };

    if (!['conversation', 'announcement', 'lecture1', 'lecture2'].includes(kind)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid kind. Must be one of: conversation, announcement, lecture1, lecture2' },
        { status: 400 }
      );
    }

    const sb = getServiceSupabase();

    // 기존(다른 시험) 주제들 조회
    const { data: tests } = await sb
      .from('listening_tests_2026')
      .select('payload');

    const bucket = kind === 'conversation' ? 'conversation' : kind === 'announcement' ? 'announcement' : 'lecture';

    const existingTopics: string[] = [];
    if (tests) {
      for (const test of tests) {
        const payload = test.payload as any;
        const used = payload?.meta?.usedTopics?.[bucket] as string[] | undefined;
        if (used) existingTopics.push(...used.filter(Boolean));

        // 레거시 payload 호환 (구버전 meta.conversationTopic 등)
        if (payload?.meta) {
          if (kind === 'conversation' && payload.meta.conversationTopic) {
            existingTopics.push(payload.meta.conversationTopic);
          } else if (kind === 'announcement' && payload.meta.announcementTopic) {
            existingTopics.push(payload.meta.announcementTopic);
          } else if ((kind === 'lecture1' || kind === 'lecture2') && payload.meta.lectureTopic1) {
            existingTopics.push(payload.meta.lectureTopic1);
          } else if ((kind === 'lecture1' || kind === 'lecture2') && payload.meta.lectureTopic2) {
            existingTopics.push(payload.meta.lectureTopic2);
          }
        }
      }
    }

    // 지금 이 화면에서 이미 골라놓은 주제도 제외 (같은 시험 내 중복 방지)
    if (Array.isArray(avoid)) {
      existingTopics.push(...avoid.filter((t): t is string => typeof t === 'string' && t.trim().length > 0));
    }

    // 중복 제거
    const uniqueTopics = Array.from(new Set(existingTopics));

    // AI 주제 추천
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
