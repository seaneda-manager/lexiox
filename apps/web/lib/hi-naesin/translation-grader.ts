// lib/hi-naesin/translation-grader.ts
// Claude Haiku를 이용한 해석/작문 자동 채점

import Anthropic from '@anthropic-ai/sdk';

export type GradeResult = {
  scorePct: number;   // 0~100
  isCorrect: boolean; // scorePct >= 70
  feedbackText: string;
};

const getClient = () =>
  new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── 해석 채점 (영→한) ──────────────────────────────────────
export async function gradeTranslation(
  sentenceEn: string,
  answerKo: string,
  studentKo: string,
): Promise<GradeResult | null> {
  try {
    const client = getClient();
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: `당신은 고등학교 영어 선생님으로 학생의 영어→한국어 해석을 채점합니다.

영어 원문: "${sentenceEn}"
모범 답안: "${answerKo}"
학생 답안: "${studentKo}"

채점 기준:
- 핵심 의미 정확성 (가장 중요, 60점)
- 주요 단어(동사·명사·형용사) 올바른 번역 (25점)
- 전체적 문장 흐름 (15점)
- 70점 이상 = 정답
- 표현이 조금 달라도 의미가 맞으면 70점 이상 가능
- 의미가 뒤바뀌거나 핵심 동사/명사가 빠지면 70점 미만

JSON만 출력 (다른 텍스트 없이):
{"score": <0~100 정수>, "feedback": "<1~2문장 한국어 피드백>"}`,
        },
      ],
    });

    const text = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';
    // JSON 블록이 있으면 추출
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0)));

    return {
      scorePct: score,
      isCorrect: score >= 70,
      feedbackText: String(parsed.feedback ?? '').trim(),
    };
  } catch (e) {
    console.error('[gradeTranslation] error:', e);
    return null;
  }
}

// ── 작문 채점 (한→영) ──────────────────────────────────────
export async function gradeWriting(
  promptKo: string,
  answerEn: string,
  studentEn: string,
): Promise<GradeResult | null> {
  try {
    const client = getClient();
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: `당신은 고등학교 영어 선생님으로 학생의 한국어→영어 작문을 채점합니다.

한국어 프롬프트: "${promptKo}"
모범 영어 답안: "${answerEn}"
학생 영어 답안: "${studentEn}"

채점 기준:
- 핵심 의미 정확성 (50점) - 한국어 프롬프트의 내용을 영어로 올바르게 표현했는가
- 핵심 어휘 사용 (30점) - 주요 단어(동사·명사)를 올바르게 사용했는가
- 문법 (20점) - 기본 문법 오류 없이 문장이 성립하는가
- 70점 이상 = 정답
- 표현이 달라도 의미가 맞으면 70점 이상 가능
- 의미가 틀리거나 문법 오류가 심하면 70점 미만

JSON만 출력 (다른 텍스트 없이):
{"score": <0~100 정수>, "feedback": "<1~2문장 한국어 피드백>"}`,
        },
      ],
    });

    const text = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0)));

    return {
      scorePct: score,
      isCorrect: score >= 70,
      feedbackText: String(parsed.feedback ?? '').trim(),
    };
  } catch (e) {
    console.error('[gradeWriting] error:', e);
    return null;
  }
}
