// lib/hi-naesin/structure-generator.ts
// Claude Haiku 로 identify→categorize 구조분석 드릴 자동 생성.
// 1차: 지칭추론(reference) — 문장 내 대명사/지시어가 가리키는 대상을 찾고 유형을 분류.

import Anthropic from '@anthropic-ai/sdk';
import type { IdentifyCategorizePayload } from '@/models/hi-naesin/drill';

type StructResult = Array<{ orderIndex: number; payload: IdentifyCategorizePayload }>;
type StructOk   = { ok: true;  results: StructResult };
type StructFail = { ok: false; error: string; results: [] };

const getClient = () => new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function parseJsonArray<T>(text: string): T[] {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try { return JSON.parse(match[0]) as T[]; } catch { return []; }
}

// 지칭추론 카테고리 (categorize 보기) — key 는 채점/분석용 고정값
const REFERENCE_OPTIONS = [
  { key: 'noun',     label: '단일 명사(구)' },
  { key: 'clause',   label: '앞 절·문장 전체' },
  { key: 'abstract', label: '추상 개념·상황' },
];
const REFERENCE_KEYS = new Set(REFERENCE_OPTIONS.map((o) => o.key));

/** referent 가 sentence 안에 그대로 들어있는지 (span 클릭 채점 가능 여부) */
function containsSpan(sentence: string, span: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/gi, ' ').trim();
  return norm(sentence).includes(norm(span));
}

export async function generateReferenceQuestions(
  sentences: Array<{ sentenceEn: string }>,
): Promise<StructOk | StructFail> {
  const capped = sentences.filter((s) => s.sentenceEn).slice(0, 12);
  if (capped.length === 0) return { ok: true, results: [] };

  try {
    const client = getClient();
    const sentenceList = capped.map((s, i) => `[${i}] ${s.sentenceEn}`).join('\n');

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 6000,
      messages: [
        {
          role: 'user',
          content: `You are a Korean 내신/수능 English teacher creating 지칭추론 (reference resolution) drills.

Passage sentences:
${sentenceList}

For EACH sentence that contains a pronoun or demonstrative (it, they, this, that, these, those, such, one, etc.) whose referent appears WITHIN THE SAME SENTENCE, create one drill.

CRITICAL rules:
- "referent" MUST be an EXACT substring of "sentence" (the student clicks it word-by-word).
- "pronoun" is the referring word/phrase being asked about.
- "category": classify what the referent is — EXACTLY one of:
    "noun"     = a single noun phrase (a specific thing)
    "clause"   = a whole preceding clause/sentence idea
    "abstract" = an abstract concept or situation
- "explanation": 1 sentence in Korean explaining why.
- If the sentence has no pronoun with an in-sentence referent, set "skip": true.

Output ONLY a valid JSON array — no markdown fences:
[
  {
    "sentenceIndex": 0,
    "skip": false,
    "sentence": "The scientist who discovered the vaccine believed it would save millions.",
    "pronoun": "it",
    "referent": "the vaccine",
    "category": "noun",
    "explanation": "it은 앞에 나온 the vaccine을 가리킵니다."
  }
]`,
        },
      ],
    });

    const text = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';
    const items = parseJsonArray<{
      sentenceIndex: number;
      skip?: boolean;
      sentence: string;
      pronoun: string;
      referent: string;
      category: string;
      explanation?: string;
    }>(text);

    const results: StructResult = items
      .filter((it) =>
        !it.skip &&
        it.sentenceIndex < capped.length &&
        it.sentence && it.referent && it.pronoun &&
        REFERENCE_KEYS.has(it.category) &&
        containsSpan(it.sentence, it.referent),
      )
      .map((it) => ({
        orderIndex: it.sentenceIndex,
        payload: {
          mode: 'reference',
          sentence: it.sentence,
          depth: 2,
          targets: [
            {
              span: it.referent,
              anchor: it.pronoun,
              category: it.category,
              options: REFERENCE_OPTIONS,
              elementTag: `ref:${it.category}`,
              explanation: it.explanation ?? '',
            },
          ],
        },
      }));

    return { ok: true, results };
  } catch (e) {
    console.error('[generateReferenceQuestions] error:', e);
    return { ok: false, error: e instanceof Error ? e.message : String(e), results: [] };
  }
}
