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

// 응답 토큰 초과 방지 (생각단위 분리는 문법 문제보다 출력이 큼) → 10문장씩 나눠 호출
const BATCH_SIZE = 10;

type Sentence = { sentenceEn: string; sentenceKo: string };

function buildPrompt(all: Sentence[], start: number, end: number): string {
  const sentenceList = all
    .map((s, i) => `[${i}] EN: ${s.sentenceEn}\n    KO: ${s.sentenceKo}`)
    .join('\n');

  return `You are a veteran Korean 내신 English teacher who also writes school exam questions (출제위원). You are preparing a layered translation/composition drill for beginner-to-intermediate students.

Full passage (for context — read it all before judging):
${sentenceList}

Produce output ONLY for sentences [${start}] to [${end - 1}] (inclusive). Use the sentenceIndex shown above.

For EACH of those sentences, do THREE things:

1. Rate "importance". The purpose is: which sentences must a beginner/intermediate student translate and write out by hand AT LEAST ONCE to really improve? Judge as an experienced exam writer AND as a teacher who knows what makes students grow.

   "high" = the student must personally translate and compose this sentence once. Choose a sentence as high if ANY of these hold:
     a) An exam writer would likely turn it into a 서술형 해석/영작 item or a sentence-structure question: it contains a core grammar structure such as a relative clause, participial phrase / 분사구문, varied to-infinitive uses, 도치/강조, 가정법, 비교 구문, 수동/완료 structures, or several clauses/pronouns whose relations must be worked out.
     b) It carries the topic sentence, main claim, conclusion, or a 전환 (however / but / in fact) that the passage turns on.
     c) Beginner/intermediate students commonly mistranslate or misorder it (polysemous word, modifier far from its head noun, long subject before the verb) AND doing it themselves would clearly teach them something.
   A sentence is NOT high if it is so long or dense that an intermediate student could not realistically write it from scratch — rate it "medium" instead (it is still tested with a 3-choice item).

   "medium" = worth a translation check but not a must-write: moderately complex or informative, meaning is clear, less likely to be tested as 서술형.
   "low" = short and easy, simple listing/example/detail sentences, repetition of an earlier point — review only.

   Distribution target across the sentences you output: about 40% "high", about 35% "medium", at most 25% "low". If there are 5 or more sentences, at least 2 must be "high"; never rate everything "medium" or everything "low". Prefer promoting to "high" the sentences that best match criteria (a)-(c).

2. Split the sentence into 3-5 "생각단위" (thought units / meaningful chunks) that align between English and Korean, in the CORRECT reading order. "koChunks" and "enChunks" must have the SAME number of chunks, each koChunks[i] corresponding to enChunks[i] in meaning.

3. ONLY IF importance is "medium": create a 3-choice Korean translation question for the sentence — "choiceOptions" with exactly 3 options (1 correct Korean translation + 2 wrong ones), where:
   - one wrong option is a 구조적 오역 (misreads sentence structure — word order, modifier attachment, subject-object confusion)
   - the other wrong option is a 핵심단어 오역 (mistranslates one key word/phrase, e.g. wrong meaning of a polysemous word or similar-looking word)
   Include a 1-sentence Korean "explanation" of why the correct option is right.
   If importance is "low" or "high", omit "choiceOptions" and "explanation" entirely.

CRITICAL rules:
- Chunks must be short phrases (2-6 words each), not single words and not the whole sentence.
- If a sentence is too short to meaningfully split (fewer than ~6 words), set "skip": true instead.

Output ONLY a valid JSON array — no markdown fences, no extra text. The example below shows one "medium" item; "high" and "low" items omit choiceOptions/explanation:
[
  {
    "sentenceIndex": ${start},
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
]`;
}

async function generateBatch(
  client: Anthropic,
  all: Sentence[],
  start: number,
  end: number,
): Promise<Array<{ sentenceIndex: number; result: ThoughtUnitResult }>> {
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 8000,
    messages: [{ role: 'user', content: buildPrompt(all, start, end) }],
  });

  const text =
    msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';

  return parseJsonArray<RawItem>(text)
    .filter((item) => !item.skip && item.sentenceIndex >= start && item.sentenceIndex < end)
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
}

export async function generateThoughtUnitDrills(
  sentences: Sentence[],
): Promise<ThoughtUnitOk | ThoughtUnitFail> {
  if (sentences.length === 0) return { ok: true, results: [] };

  try {
    const client = getClient();

    const batches: Array<[number, number]> = [];
    for (let start = 0; start < sentences.length; start += BATCH_SIZE) {
      batches.push([start, Math.min(start + BATCH_SIZE, sentences.length)]);
    }

    const perBatch = await Promise.all(
      batches.map(([start, end]) => generateBatch(client, sentences, start, end)),
    );

    return { ok: true, results: perBatch.flat() };
  } catch (e) {
    console.error('[generateThoughtUnitDrills] error:', e);
    return { ok: false, error: e instanceof Error ? e.message : String(e), results: [] };
  }
}
