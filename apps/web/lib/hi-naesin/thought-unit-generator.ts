// lib/hi-naesin/thought-unit-generator.ts
// Claude Haiku를 이용한 생각단위 배열 드릴 + 문장 중요도 태깅 + 3지선다 오역 문제 자동 생성

import Anthropic from '@anthropic-ai/sdk';

export type Importance = 'low' | 'medium' | 'high';

export type ThoughtUnitChoiceOption = {
  key: 'a' | 'b' | 'c';
  text: string;
  isCorrect: boolean;
};

export type ThoughtUnitResult = {
  importance: Importance;
  koChunks: Array<{ id: string; text: string }>;
  enChunks: Array<{ id: string; text: string }>;
  choiceOptions?: ThoughtUnitChoiceOption[];
  explanation?: string;
};

type ThoughtUnitOk   = { ok: true;  results: Array<{ sentenceIndex: number; result: ThoughtUnitResult }> };
type ThoughtUnitFail = { ok: false; error: string; results: [] };

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

type RawItem = {
  sentenceIndex: number;
  skip?: boolean;
  importance?: Importance;
  koChunks?: string[];
  enChunks?: string[];
  choiceOptions?: Array<{ key: 'a' | 'b' | 'c'; text: string; isCorrect: boolean }>;
  explanation?: string;
};

export async function generateThoughtUnitDrills(
  sentences: Array<{ sentenceEn: string; sentenceKo: string }>,
): Promise<ThoughtUnitOk | ThoughtUnitFail> {
  if (sentences.length === 0) return { ok: true, results: [] };

  // 최대 10개 문장으로 제한 → 응답 토큰 초과 방지 (생각단위 분리는 문법 문제보다 출력이 큼)
  const capped = sentences.slice(0, 10);

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
          content: `You are a Korean 내신 English teacher preparing a layered translation/composition drill.

Passage sentences:
${sentenceList}

For EACH sentence, do THREE things:

1. Rate "importance" as one of: "low" (짧고 쉬운 문장, 복습만 필요), "medium" (해석 확인이 필요하지만 짧거나 크게 어렵지 않은 문장), "high" (내신에서 중요하거나 구조가 복잡해 완전히 자유 해석/작문 연습이 필요한 문장).

2. Split the sentence into 3-5 "생각단위" (thought units / meaningful chunks) that align between English and Korean, in the CORRECT reading order. "koChunks" and "enChunks" must have the SAME number of chunks, each koChunks[i] corresponding to enChunks[i] in meaning.

3. ONLY IF importance is "medium": create a 3-choice Korean translation question for the sentence — "choiceOptions" with exactly 3 options (1 correct Korean translation + 2 wrong ones), where:
   - one wrong option is a 구조적 오역 (misreads sentence structure — word order, modifier attachment, subject-object confusion)
   - the other wrong option is a 핵심단어 오역 (mistranslates one key word/phrase, e.g. wrong meaning of a polysemous word or similar-looking word)
   Include a 1-sentence Korean "explanation" of why the correct option is right.
   If importance is "low" or "high", omit "choiceOptions" and "explanation" entirely.

CRITICAL rules:
- Chunks must be short phrases (2-6 words each), not single words and not the whole sentence.
- If a sentence is too short to meaningfully split (fewer than ~6 words), set "skip": true instead.

Output ONLY a valid JSON array — no markdown fences, no extra text:
[
  {
    "sentenceIndex": 0,
    "skip": false,
    "importance": "medium",
    "koChunks": ["과학자들은", "운동이 건강을 개선한다는 것을", "발견했다"],
    "enChunks": ["Scientists have discovered", "that exercise", "improves health"],
    "choiceOptions": [
      { "key": "a", "text": "과학자들은 운동이 건강을 개선한다는 것을 발견했다", "isCorrect": true },
      { "key": "b", "text": "건강이 운동을 개선한다는 것을 과학자들이 발견했다", "isCorrect": false },
      { "key": "c", "text": "과학자들은 운동이 건강을 발견했다는 것을 개선했다", "isCorrect": false }
    ],
    "explanation": "improves의 주어는 exercise이므로 '운동이 건강을 개선한다'가 맞습니다."
  }
]`,
        },
      ],
    });

    const text =
      msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';

    const items = parseJsonArray<RawItem>(text);

    const results = items
      .filter((item) => !item.skip && item.sentenceIndex < capped.length)
      .filter((item) => (item.koChunks?.length ?? 0) >= 2 && item.koChunks?.length === item.enChunks?.length)
      .map((item) => {
        const importance: Importance = item.importance ?? 'medium';
        const koChunks = (item.koChunks ?? []).map((text, i) => ({ id: `k${i}`, text }));
        const enChunks = (item.enChunks ?? []).map((text, i) => ({ id: `k${i}`, text }));

        const result: ThoughtUnitResult = { importance, koChunks, enChunks };
        if (importance === 'medium' && item.choiceOptions && item.choiceOptions.length === 3) {
          result.choiceOptions = item.choiceOptions;
          result.explanation = item.explanation;
        }
        return { sentenceIndex: item.sentenceIndex, result };
      });

    return { ok: true, results };
  } catch (e) {
    console.error('[generateThoughtUnitDrills] error:', e);
    return { ok: false, error: e instanceof Error ? e.message : String(e), results: [] };
  }
}
