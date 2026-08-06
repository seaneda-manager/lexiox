export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface Choice {
  id: string;
  text: string;
  is_correct: boolean;
}

interface Question {
  id: string;
  number: number;
  stem: string;
  choices: Choice[];
}

/**
 * POST /api/admin/problem-bank/generate-daily-life
 *
 * Daily Life 문제 자동 생성 (이메일, 공지, SNS 등)
 *
 * Request:
 * {
 *   "content": "이메일/공지/SNS 원문",
 *   "topic": "Library Hours",
 *   "difficulty": "easy" | "core" | "hard",
 *   "contextType": "email" | "notice" | "social_post" | "web_article" | "other"
 * }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { content, topic, difficulty, contextType } = body as {
      content: string;
      topic: string;
      difficulty: 'easy' | 'core' | 'hard';
      contextType: 'email' | 'notice' | 'social_post' | 'web_article' | 'other';
    };

    if (!content || !topic || !difficulty) {
      return NextResponse.json(
        { ok: false, error: 'content, topic, and difficulty are required' },
        { status: 400 }
      );
    }

    console.log('[GenerateDL] Generating for topic:', topic);

    const client = new Anthropic();

    const systemPrompt = `당신은 TOEFL 일상 생활 읽기 문제 출제 전문가입니다.

주어진 짧은 지문(이메일, 공지, SNS 등)에서 3~4개의 객관식 문제를 생성하세요.

## 규칙:

1. **문제 개수**: 3~4개
2. **선택지**: 각 문제당 4개
3. **정답 분포**: A/B/C/D 균등 분포 (AAAA, BBBB, ABCD 패턴 금지)
4. **문제 유형**: 세부 사항 이해, 추론, 목적 파악 등 다양하게
5. **지문 활용**: 전체 지문의 세부 내용 묻기

## JSON 형식:

\`\`\`json
{
  "questions": [
    {
      "number": 1,
      "stem": "문제 질문",
      "choices": [
        { "text": "선택지 A", "is_correct": true },
        { "text": "선택지 B", "is_correct": false },
        { "text": "선택지 C", "is_correct": false },
        { "text": "선택지 D", "is_correct": false }
      ]
    },
    ...
  ]
}
\`\`\`

JSON만 반환하세요.`;

    const userPrompt = `다음 ${contextType} 지문으로 Daily Life 문제를 생성하세요:

지문:
"""
${content}
"""

주제: ${topic}
난이도: ${difficulty}`;

    const message = await client.messages.create({
      model: 'claude-opus-5-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const messageContent = message.content[0];
    if (messageContent.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const jsonMatch = messageContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(parsed.questions) || parsed.questions.length < 3) {
      throw new Error(`Expected 3~4 questions, got ${parsed.questions.length}`);
    }

    // DB에 저장
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 정답 분포 확인
    const answerDist = parsed.questions.map((q: any) =>
      q.choices.findIndex((c: any) => c.is_correct)
    );

    const { data: savedProblem, error: saveError } = await supabase
      .from('problem_bank_daily_life_2026')
      .insert({
        topic,
        difficulty,
        context_type: contextType,
        content_html: `<div>${content.replace(/\n/g, '<br>')}</div>`,
        questions: parsed.questions.map((q: any, idx: number) => ({
          id: `q-${Date.now()}-${idx}`,
          number: q.number || idx + 1,
          stem: q.stem,
          choices: q.choices.map((c: any, cidx: number) => ({
            id: `c-${cidx}`,
            text: c.text,
            is_correct: c.is_correct,
          })),
        })),
        created_by: user.id,
      })
      .select()
      .single();

    if (saveError) {
      console.error('[GenerateDL] Save error:', saveError);
      return NextResponse.json(
        { ok: false, error: 'Failed to save problem' },
        { status: 500 }
      );
    }

    console.log('[GenerateDL] ✅ Saved problem:', savedProblem.id);

    return NextResponse.json({
      ok: true,
      problem: {
        id: savedProblem.id,
        topic: savedProblem.topic,
        difficulty: savedProblem.difficulty,
        context_type: savedProblem.context_type,
        questions: savedProblem.questions,
      },
    });
  } catch (err: any) {
    console.error('[GenerateDL] ERROR:', err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? 'Unknown error',
      },
      { status: 500 }
    );
  }
}
