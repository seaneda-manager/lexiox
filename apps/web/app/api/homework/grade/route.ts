// app/api/homework/grade/route.ts
// 학생 숙제 사진 → Claude OCR → 텍스트 정답과 비교 → 채점

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getServerSupabase } from '@/lib/supabase/server';
import { awardPoints } from '@/lib/gamification/awardPoints';

export const runtime = 'nodejs';
export const maxDuration = 60;

// ── 타입 ────────────────────────────────────────────────────────
export type AnswerKeyItem = {
  number: number;
  answer: string;
  hint?:  string | null;  // 오답 시 표시할 힌트 (선택)
};

export type GradeItem = {
  number:         number;
  student_answer: string;
  correct_answer: string;
  is_correct:     boolean;
  explanation:    string | null;
};

export type GradeResult = {
  items:            GradeItem[];
  correct_count:    number;
  total_count:      number;
  score_pct:        number;
  overall_feedback: string;
};

// ── POST ────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const formData        = await req.formData();
    const homeworkId      = formData.get('homework_id') as string | null;
    const studentPhotoFile = formData.get('student_photo') as File | null;

    if (!homeworkId || !studentPhotoFile) {
      return NextResponse.json(
        { error: 'homework_id와 student_photo가 필요합니다.' },
        { status: 400 },
      );
    }

    // ── 1. 숙제 + 정답 데이터 ────────────────────────────────────
    const { data: homework } = await supabase
      .from('photo_homework')
      .select('id, title, subject, answer_key_data')
      .eq('id', homeworkId)
      .eq('is_active', true)
      .maybeSingle();

    if (!homework) {
      return NextResponse.json({ error: '숙제를 찾을 수 없습니다.' }, { status: 404 });
    }

    const answerKey = (homework as any).answer_key_data as
      | { items: AnswerKeyItem[] }
      | null;

    if (!answerKey?.items?.length) {
      return NextResponse.json(
        { error: '정답이 아직 등록되지 않았습니다.' },
        { status: 400 },
      );
    }

    // ── 2. 학생 사진 → base64 ────────────────────────────────────
    const buf         = await studentPhotoFile.arrayBuffer();
    const base64      = Buffer.from(buf).toString('base64');
    const mediaType   = (studentPhotoFile.type || 'image/jpeg') as
      'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

    // ── 3. 정답 목록 텍스트 구성 ─────────────────────────────────
    const answerKeyText = answerKey.items
      .map((item) => {
        const hint = item.hint ? ` (${item.hint})` : '';
        return `${item.number}번: ${item.answer}${hint}`;
      })
      .join('\n');

    const subjectHint =
      homework.subject === 'vocab'   ? '어휘/단어 숙제' :
      homework.subject === 'grammar' ? '문법 드릴 숙제' :
      homework.subject === 'reading' ? '리딩 문제 숙제' :
      '영어 숙제';

    // ── 4. Claude API 호출 ───────────────────────────────────────
    const client = new Anthropic();

    const message = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: [
        {
          type: 'text',
          text: `당신은 한국 영어학원의 숙제 채점 보조 AI입니다.
학생이 손으로 쓴 숙제 사진을 분석하여 정답과 비교합니다.
결과는 반드시 지정된 JSON 형식으로만 응답하세요. JSON 외 다른 텍스트는 절대 포함하지 마세요.`,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `숙제: "${homework.title}" (${subjectHint})

【정답지】
${answerKeyText}

채점 기준:
- 철자가 완전히 같아야 정답 (대소문자 무시)
- 단어 문제: 의미가 같은 동의어도 정답 인정
- 빈칸이거나 읽기 어려운 경우 "미기입" 처리

반드시 아래 JSON 형식으로만 응답:
{
  "items": [
    {
      "number": 1,
      "student_answer": "학생이 쓴 답 (읽기 어려우면 '판독불가')",
      "correct_answer": "정답",
      "is_correct": true,
      "explanation": null
    },
    {
      "number": 2,
      "student_answer": "학생이 쓴 답",
      "correct_answer": "정답",
      "is_correct": false,
      "explanation": "한국어로 오답 이유 1줄"
    }
  ],
  "correct_count": 8,
  "total_count": 10,
  "score_pct": 80,
  "overall_feedback": "전반적인 평가를 한국어로 1-2문장"
}`,
              cache_control: { type: 'ephemeral' },
            },
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 },
            },
          ],
        },
      ],
    } as Parameters<typeof client.messages.create>[0]);

    // ── 5. JSON 파싱 ─────────────────────────────────────────────
    const raw = message.content[0].type === 'text' ? message.content[0].text : '';
    let result: GradeResult;

    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response');
      result = JSON.parse(jsonMatch[0]) as GradeResult;
    } catch {
      return NextResponse.json({ error: 'AI 응답 파싱 실패', raw }, { status: 500 });
    }

    // ── 6. DB 저장 (upsert) ──────────────────────────────────────
    await supabase
      .from('photo_homework_submissions')
      .upsert(
        {
          homework_id:   homeworkId,
          student_id:    user.id,
          ai_results:    result,
          correct_count: result.correct_count,
          total_count:   result.total_count,
          graded_at:     new Date().toISOString(),
        },
        { onConflict: 'homework_id,student_id' },
      );

    // 포인트 적립: 제출 + 오답 교정 기회 제공
    void awardPoints({
      studentId: user.id,
      ruleId:    'homework_submit',
      sourceRef: homeworkId,
      metadata:  { score_pct: result.score_pct, correct: result.correct_count, total: result.total_count },
    });

    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error('[homework/grade]', err);
    return NextResponse.json({ error: '채점 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
