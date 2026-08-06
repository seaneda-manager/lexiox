export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/admin/problem-bank/generate-academic
 *
 * Academic Passage 문제 자동 생성 (긴 학술 지문)
 *
 * Request:
 * {
 *   "passage": "학술 지문 원문 (200~250 단어)",
 *   "title": "Marine Biology",
 *   "topic": "Marine Biology",
 *   "difficulty": "easy" | "core" | "hard"
 * }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { passage, title, topic, difficulty } = body as {
      passage: string;
      title: string;
      topic: string;
      difficulty: 'easy' | 'core' | 'hard';
    };

    if (!passage || !title || !topic || !difficulty) {
      return NextResponse.json(
        { ok: false, error: 'passage, title, topic, and difficulty are required' },
        { status: 400 }
      );
    }

    console.log('[GenerateAcademic] Generating for topic:', topic);

    const client = new Anthropic();

    const systemPrompt = `당신은 TOEFL 학술 지문 읽기 문제 출제 전문가입니다.

주어진 학술 지문(200~250 단어)에서 5개의 객관식 문제를 생성하세요.

## 규칙:

1. **문제 개수**: 정확히 5개
2. **선택지**: 각 문제당 4개
3. **정답 분포**: A/B/C/D 균등 분포 (AAAA, BBBB, ABCD 패턴 금지)
4. **문제 유형**:
   - 세부 사항 (2~3개)
   - 추론/함의 (1~2개)
   - 주요 개념/목적 (0~1개)
5. **난이도**: 낮음(직접), 중간(문맥), 높음(추론) 섞기

## JSON 형식:

\`\`\`json
{
  "questions": [
    {
      "number": 1,
      "stem": "According to the passage, ...",
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

    const userPrompt = `다음 학술 지문으로 Academic Passage 문제를 생성하세요:

제목: ${title}
주제: ${topic}
난이도: ${difficulty}

지문:
"""
${passage}
"""`;

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

    if (!Array.isArray(parsed.questions) || parsed.questions.length !== 5) {
      throw new Error(`Expected 5 questions, got ${parsed.questions.length}`);
    }

    // DB에 저장
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: savedProblem, error: saveError } = await supabase
      .from('problem_bank_academic_passage_2026')
      .insert({
        topic,
        title,
        difficulty,
        passage_html: `<p>${passage.replace(/\n/g, '</p><p>')}</p>`,
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
      console.error('[GenerateAcademic] Save error:', saveError);
      return NextResponse.json(
        { ok: false, error: 'Failed to save problem' },
        { status: 500 }
      );
    }

    console.log('[GenerateAcademic] ✅ Saved problem:', savedProblem.id);

    return NextResponse.json({
      ok: true,
      problem: {
        id: savedProblem.id,
        topic: savedProblem.topic,
        title: savedProblem.title,
        difficulty: savedProblem.difficulty,
        questions: savedProblem.questions,
      },
    });
  } catch (err: any) {
    console.error('[GenerateAcademic] ERROR:', err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? 'Unknown error',
      },
      { status: 500 }
    );
  }
}
