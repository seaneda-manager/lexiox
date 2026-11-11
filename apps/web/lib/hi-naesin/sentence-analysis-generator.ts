// lib/hi-naesin/sentence-analysis-generator.ts
// 문장 분석 v2(structure_svo, version 2) 드릴 AI 생성.
// AI 에게 "단어 인덱스 표"를 주고 인덱스로 정답을 받는다 → 서버가 validateSentenceAnalysis 로 검증.
// 현재 단계: 기본 레벨(완전 주어 / 핵심 주어 / 동사). 중급·고급 필드는 이후 단계에서 확장.

import Anthropic from '@anthropic-ai/sdk';
import type { SaSpan, SentenceAnalysisPayload } from '@/models/hi-naesin/drill';
import { tokenizeSentence, validateSentenceAnalysis } from './sentenceAnalysis';

const getClient = () => new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type Raw = {
  i: number;
  skip?: boolean;
  fullS?: SaSpan;
  coreS?: SaSpan[];
  V?: SaSpan;
};

const BATCH = 8;
const MAX_SENTENCES = 24;

async function runBatch(
  client: Anthropic,
  batch: Array<{ idx: number; sentence: string }>,
): Promise<Array<{ orderIndex: number; payload: SentenceAnalysisPayload }>> {
  const listing = batch
    .map((b) => {
      const toks = tokenizeSentence(b.sentence).map((t) => `${t.index}:${t.text}`).join(' ');
      return `[${b.idx}] ${b.sentence}\n    tokens: ${toks}`;
    })
    .join('\n');

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 4000,
    messages: [{
      role: 'user',
      content: `You create sentence-analysis drills for Korean high-school English students.
Each sentence is given with its word tokens as "index:word" (indices start at 0, punctuation is not a token).
For each sentence identify the MAIN clause's:
- "fullS": the complete subject INCLUDING all its modifiers (adjectives, prepositional phrases, relative clauses, participles, appositives), as [startIndex, endIndex] inclusive.
- "coreS": the simple subject — the head noun/pronoun WITHOUT modifiers — as an array of [start,end]. Use several entries only for coordinated subjects (e.g. "Tom and Mary" → two entries, fullS spans both). The core subject must lie inside fullS.
- "V": the main verb phrase including auxiliaries/negation, as [start,end] (e.g. "has been shown", "did not go"). Do NOT include objects, complements, adverbs.
Rules:
- Use token indices exactly as given; never invent indices.
- If the sentence is a question, imperative without subject, has an unclear subject, or starts with a long dependent clause that makes the main clause ambiguous, set "skip": true.
- If the main clause has a coordinated verb ("ran and jumped"), set "skip": true.
- A fragment or heading is also "skip": true.

Sentences:
${listing}

Output ONLY a JSON array, no markdown:
[{"i": 0, "skip": false, "fullS": [0,4], "coreS": [[2,2]], "V": [5,5]}]`,
    }],
  });

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
  const m = text.match(/\[[\s\S]*\]/);
  if (!m) return [];
  let raws: Raw[] = [];
  try { raws = JSON.parse(m[0]) as Raw[]; } catch { return []; }

  const out: Array<{ orderIndex: number; payload: SentenceAnalysisPayload }> = [];
  for (const r of raws) {
    const src = batch.find((b) => b.idx === r.i);
    if (!src || r.skip || !r.fullS || !r.coreS || !r.V) continue;
    const payload: SentenceAnalysisPayload = {
      version: 2,
      sentence: src.sentence,
      level: 'basic',
      key: { clauses: [{ id: 'c0', kind: 'main', fullS: [r.fullS], coreS: r.coreS, V: r.V }] },
    };
    if (validateSentenceAnalysis(payload)) continue; // 검증 실패는 버린다
    out.push({ orderIndex: src.idx, payload });
  }
  return out;
}

export async function generateSentenceAnalysisQuestions(
  sentences: Array<{ sentenceEn: string }>,
): Promise<
  | { ok: true; results: Array<{ orderIndex: number; payload: SentenceAnalysisPayload }> }
  | { ok: false; error: string; results: [] }
> {
  const items = sentences
    .map((s, idx) => ({ idx, sentence: s.sentenceEn }))
    .filter((s) => s.sentence && tokenizeSentence(s.sentence).length >= 4)
    .slice(0, MAX_SENTENCES);
  if (items.length === 0) return { ok: true, results: [] };

  try {
    const client = getClient();
    const batches: typeof items[] = [];
    for (let i = 0; i < items.length; i += BATCH) batches.push(items.slice(i, i + BATCH));
    const settled = await Promise.all(batches.map((b) => runBatch(client, b)));
    return { ok: true, results: settled.flat().sort((a, b) => a.orderIndex - b.orderIndex) };
  } catch (e) {
    console.error('[generateSentenceAnalysisQuestions] error:', e);
    return { ok: false, error: e instanceof Error ? e.message : String(e), results: [] };
  }
}
