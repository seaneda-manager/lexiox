// lib/hi-naesin/grammar-generator.ts
// Claude Haiku를 이용한 문법 4지선다 드릴 자동 생성

import Anthropic from '@anthropic-ai/sdk';

export type GrammarQuestion = {
  sentenceTemplate: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correct: 'a' | 'b' | 'c' | 'd';
  explanation: string;
  grammarCategory: string;
  contextBefore?: string;
};

type GrammarResult = Array<{ orderIndex: number; question: GrammarQuestion }>;
type GrammarOk   = { ok: true;  results: GrammarResult };
type GrammarFail = { ok: false; error: string; results: [] };

const getClient = () =>
  new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/** 응답에서 JSON 배열 파싱 (마크다운 코드블록 처리 포함) */
function parseJsonArray<T>(text: string): T[] {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    return JSON.parse(match[0]) as T[];
  } catch {
    return [];
  }
}

/** sentenceTemplate 에서 ____ 포함 버전을 우선 선택 */
function pickTemplate(item: {
  sentenceTemplate?: string;
  sentenceWithBlank?: string;
  [key: string]: unknown;
}): string {
  const candidates = [item.sentenceWithBlank, item.sentenceTemplate].filter(Boolean) as string[];
  return candidates.find((s) => s.includes('____')) ?? candidates[0] ?? '';
}

// ── 문장 내 문법 드릴 (동사형태 / 접속사 / 분사 등) ──────────────────
export async function generateGrammarQuestions(
  sentences: Array<{ sentenceEn: string; sentenceKo: string }>,
): Promise<GrammarOk | GrammarFail> {
  if (sentences.length === 0) return { ok: true, results: [] };

  // 최대 12개 문장으로 제한 → 응답 토큰 초과 방지
  const capped = sentences.slice(0, 12);

  try {
    const client = getClient();

    const sentenceList = capped
      .map((s, i) => `[${i}] EN: ${s.sentenceEn}\n    KO: ${s.sentenceKo}`)
      .join('\n');

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 8000,
      messages: [
        {
          role: 'user',
          content: `You are a Korean 내신/수능 English teacher creating grammar multiple-choice questions.

Passage sentences:
${sentenceList}

For EACH sentence, create one 4-choice grammar question targeting its most important grammar point.

Grammar categories (use EXACTLY one):
시제 | 수 일치 | 분사 | 명사절 접속사 | 부사절 접속사 | 관계사 | 도치 | 가정법 | 수량 표현 | 대명사

CRITICAL rules:
- "sentenceTemplate" MUST be the sentence with exactly ONE word/phrase replaced by ____ (four underscores)
- 3 wrong options must be plausible but grammatically incorrect in context
- "explanation": 1-2 sentences in Korean explaining WHY the correct answer is right
- If a sentence has no clear grammar test point, set "skip": true

Output ONLY a valid JSON array — no markdown fences, no extra text:
[
  {
    "sentenceIndex": 0,
    "skip": false,
    "sentenceTemplate": "Scientists have ____ that exercise improves health.",
    "optionA": "discovered",
    "optionB": "discover",
    "optionC": "discovering",
    "optionD": "to discover",
    "correct": "a",
    "explanation": "have + 과거분사(p.p.) 형태인 현재완료 구조입니다. 주어 Scientists에 맞는 have discovered가 정답입니다.",
    "grammarCategory": "시제"
  }
]`,
        },
      ],
    });

    const text =
      msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';

    const items = parseJsonArray<{
      sentenceIndex: number;
      skip?: boolean;
      sentenceTemplate?: string;
      sentenceWithBlank?: string;
      [key: string]: unknown;
      optionA: string;
      optionB: string;
      optionC: string;
      optionD: string;
      correct: 'a' | 'b' | 'c' | 'd';
      explanation: string;
      grammarCategory: string;
    }>(text);

    const results: GrammarResult = items
      .filter((item) => !item.skip && item.sentenceIndex < capped.length)
      .map((item) => ({
        orderIndex: item.sentenceIndex,
        question: {
          sentenceTemplate: pickTemplate(item),
          optionA: item.optionA,
          optionB: item.optionB,
          optionC: item.optionC,
          optionD: item.optionD,
          correct: item.correct,
          explanation: item.explanation,
          grammarCategory: item.grammarCategory,
        },
      }));

    return { ok: true, results };
  } catch (e) {
    console.error('[generateGrammarQuestions] error:', e);
    return { ok: false, error: e instanceof Error ? e.message : String(e), results: [] };
  }
}

// ── 연결어 드릴 (문장 간 논리 관계) ─────────────────────────────────
export async function generateConnectiveQuestions(
  sentences: Array<{ sentenceEn: string }>,
): Promise<GrammarOk | GrammarFail> {
  if (sentences.length < 2) return { ok: true, results: [] };

  // 최대 8쌍으로 제한
  const capped = sentences.slice(0, 9);

  try {
    const client = getClient();

    const pairList = capped
      .slice(0, -1)
      .map(
        (s, i) =>
          `[${i}→${i + 1}] BEFORE: ${s.sentenceEn}\n  AFTER:  ${capped[i + 1].sentenceEn}`,
      )
      .join('\n\n');

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 6000,
      messages: [
        {
          role: 'user',
          content: `You are a Korean 내신/수능 English teacher creating connective word (연결어) questions.

Consecutive sentence pairs from a passage:
${pairList}

For pairs where the AFTER sentence naturally begins with (or could begin with) a discourse connective, create a 4-choice question.

Connective categories: 역접 | 인과 | 추가 | 양보 | 예시 | 순서

Rules:
- "contextAfter" MUST start with ____ followed by a comma or the rest of the sentence
  (e.g. "____, the team decided to publish." or "____ the results improved.")
- If AFTER sentence starts with a connective, replace that connective with ____
- If it doesn't, add "____, " at the beginning
- If the logical relationship is unclear, set "skip": true
- 4 options must come from DIFFERENT logical relationship types
- Explanation in Korean: state the logical relationship

Output ONLY a valid JSON array — no markdown fences:
[
  {
    "pairIndex": 0,
    "skip": false,
    "contextBefore": "The experiment produced excellent results.",
    "contextAfter": "____, the team decided to publish their findings.",
    "optionA": "Therefore",
    "optionB": "However",
    "optionC": "For example",
    "optionD": "Nevertheless",
    "correct": "a",
    "explanation": "앞 문장의 좋은 실험 결과가 발표 결정의 원인이므로 인과 관계의 Therefore가 정답입니다.",
    "grammarCategory": "연결어"
  }
]`,
        },
      ],
    });

    const text =
      msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';

    const items = parseJsonArray<{
      pairIndex: number;
      skip?: boolean;
      contextBefore: string;
      contextAfter: string;
      optionA: string;
      optionB: string;
      optionC: string;
      optionD: string;
      correct: 'a' | 'b' | 'c' | 'd';
      explanation: string;
      grammarCategory: string;
    }>(text);

    const results: GrammarResult = items
      .filter((item) => !item.skip && item.pairIndex < capped.length - 1)
      .map((item) => ({
        orderIndex: item.pairIndex,
        question: {
          sentenceTemplate: item.contextAfter?.includes('____')
            ? item.contextAfter
            : `____, ${item.contextAfter}`,
          optionA: item.optionA,
          optionB: item.optionB,
          optionC: item.optionC,
          optionD: item.optionD,
          correct: item.correct,
          explanation: item.explanation,
          grammarCategory: item.grammarCategory,
          contextBefore: item.contextBefore,
        },
      }));

    return { ok: true, results };
  } catch (e) {
    console.error('[generateConnectiveQuestions] error:', e);
    return { ok: false, error: e instanceof Error ? e.message : String(e), results: [] };
  }
}
