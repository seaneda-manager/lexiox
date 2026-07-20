// app/api/homework/hint/route.ts
// 오답 항목에 대한 단계별 힌트 생성 (3단계를 한 번에)

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getServerSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

export type HintResponse = {
  hints: [string, string, string];  // level 1, 2, 3
};

export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: '로그인 필요' }, { status: 401 });
    }

    const body = await req.json() as {
      correct_answer:      string;
      student_wrong:       string;
      subject:             string;   // vocab | grammar | reading | mixed
      question_context?:   string;   // 문항 번호 + 선생님 힌트텍스트 (있으면)
    };

    const { correct_answer, student_wrong, subject, question_context } = body;

    if (!correct_answer) {
      return NextResponse.json({ error: '정답 정보 필요' }, { status: 400 });
    }

    const subjectLabel =
      subject === 'vocab'   ? '영어 어휘/단어' :
      subject === 'grammar' ? '영어 문법' :
      subject === 'reading' ? '영어 독해' :
      '영어';

    const contextLine = question_context
      ? `\n참고 정보: ${question_context}` : '';

    const client = new Anthropic();

    const message = await client.messages.create({
      model:      'claude-haiku-4-5',
      max_tokens: 512,
      system: `당신은 한국 중고등학생에게 ${subjectLabel} 오답을 친절하게 교정해 주는 선생님입니다.
힌트는 정답을 직접 알려주지 않고 학생이 스스로 찾을 수 있도록 유도합니다.
반드시 JSON만 응답하세요.`,
      messages: [
        {
          role: 'user',
          content: `학생이 틀린 문항입니다.
정답: "${correct_answer}"
학생 오답: "${student_wrong}"${contextLine}

이 학생이 정답을 스스로 찾을 수 있도록 3단계 힌트를 한국어로 만들어 주세요.

힌트 1 (개념): 이 답이 어떤 의미/개념인지 알려주되 정답 단어는 쓰지 않기
힌트 2 (형태): 글자 수, 시작 글자, 단어 구조 등 형태적 단서
힌트 3 (근접): 거의 정답에 가깝게 (빈칸 일부 채워주기 OK)

JSON만 응답:
{"hints": ["힌트1 내용", "힌트2 내용", "힌트3 내용"]}`,
        },
      ],
    });

    const raw = message.content[0].type === 'text' ? message.content[0].text : '';
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON');

    const parsed = JSON.parse(match[0]) as HintResponse;
    return NextResponse.json(parsed);
  } catch (err) {
    console.error('[homework/hint]', err);
    return NextResponse.json({ error: '힌트 생성 실패' }, { status: 500 });
  }
}
