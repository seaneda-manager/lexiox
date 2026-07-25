import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getServiceSupabase } from '@/lib/supabase/service';

export const runtime = 'nodejs';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'placeholder' });

type TopicKind = 'conversation' | 'lecture' | 'campus';

async function suggestTopics(kind: TopicKind, existingTopics: string[]): Promise<string[]> {
  const kindLabel: Record<TopicKind, string> = {
    conversation: 'Campus Conversation',
    lecture: 'Academic Lecture',
    campus: 'Campus Announcement/Audio Log',
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
    const { kind } = await req.json();

    if (!['conversation', 'lecture', 'campus'].includes(kind)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid kind. Must be one of: conversation, lecture, campus' },
        { status: 400 }
      );
    }

    const sb = getServiceSupabase();

    // 기존 주제들 조회
    const { data: tests } = await sb
      .from('listening_tests_2026')
      .select('payload');

    const existingTopics: string[] = [];
    if (tests) {
      for (const test of tests) {
        const payload = test.payload as any;
        if (payload?.meta) {
          if (kind === 'conversation' && payload.meta.conversationTopic) {
            existingTopics.push(payload.meta.conversationTopic);
          } else if (kind === 'lecture' && payload.meta.lectureTopic) {
            existingTopics.push(payload.meta.lectureTopic);
          } else if (kind === 'campus' && payload.meta.campusTopic) {
            existingTopics.push(payload.meta.campusTopic);
          }
        }
      }
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
