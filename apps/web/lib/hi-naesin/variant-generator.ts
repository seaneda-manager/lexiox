// lib/hi-naesin/variant-generator.ts
// 변형문제(실제 시험 출제 유형) AI 출제기.
// AI 는 "무엇을 표시/교체할지"만 JSON 으로 주고, 지문 가공(밑줄·빈칸)·정답 위치·보기 배치는 서버가 직접 조립·검증한다.
// 정답 위치는 서버가 미리 정해 AI 에게 알려 주므로(1-5 고르게 분포) 정답이 한 번호로 쏠리지 않는다.

import Anthropic from '@anthropic-ai/sdk';
import { splitPassage } from './passageStructure';
import {
  blankOut,
  buildMarkedPassage,
  placeCorrect,
  targetPositions,
  validateMarkSequence,
  type Mark,
} from './variantMarks';
import type { HiNaesinVariantType } from '@/models/hi-naesin/variant';

const MODEL = 'claude-sonnet-4-6';
const getClient = () => new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/** AI 로 출제하는 유형 (지문 배열은 코드로 결정적 생성, 무관한 문장은 수동) */
export const AI_VARIANT_TYPES = [
  'grammar_error',
  'awkward_word',
  'awkward_sentence',
  'pronoun_reference',
  'idiom_meaning',
  'summary_fill',
  'topic_ko',
  'blank_sentence',
  'mood_change',
  'fact',
  'negative_fact',
] as const satisfies readonly HiNaesinVariantType[];
export type AiVariantType = (typeof AI_VARIANT_TYPES)[number];

export type GeneratedVariant = {
  questionType: HiNaesinVariantType;
  payload: Record<string, unknown>;
  choices: Array<{ text: string; isCorrect: boolean }>;
  explanation: string;
};

const CIRCLED = ['①', '②', '③', '④', '⑤'];

// ── 지문 준비 ────────────────────────────────────────────
/** 제목 줄을 빼고, 문장 중간의 줄바꿈은 이어 붙인 출제용 본문 */
export function passageForQuestions(raw: string): string {
  const sp = splitPassage(raw);
  const joined = [sp.topic, sp.body].filter(Boolean).join('\n');
  return joined.replace(/([^.!?"'”’)\s])[ \t]*\n[ \t]*(?=\S)/g, '$1 ').trim();
}

// ── 유형별 지시 ───────────────────────────────────────────
type Spec = {
  label: string;
  /** AI 에게 줄 지시. k = 서버가 정한 정답 위치 */
  instruction: (k: number) => string;
  /** 출력 JSON 예시 */
  shape: string;
};

const SPECS: Record<AiVariantType, Spec> = {
  grammar_error: {
    label: '어법 (밑줄 5개 중 틀린 것)',
    instruction: (k) => `Choose FIVE underlined items from the passage, in order of appearance. Each is a single word or very short chunk (max 3 words) that tests a grammar point: verb form/tense/voice, subject-verb agreement, relative pronoun, participle vs. gerund vs. to-infinitive, adjective vs. adverb, pronoun case/number, parallelism, etc. Use five DIFFERENT grammar points when possible.
Exactly mark number ${k} must get a "replace": an ungrammatical version of that item (wrong form for the context). The other four marks must NOT have "replace" and must be grammatically correct as in the passage.
Each "target" must be copied EXACTLY from the passage.`,
    shape: '{"marks":[{"target":"..."},{"target":"...","replace":"..."},{"target":"..."},{"target":"..."},{"target":"..."}],"grammarPoint":"e.g. 수일치","reasonOptions":["정답인 이유(정답)","그럴듯한 오답 이유","오답 이유","오답 이유"],"choiceNotes":["① 왜 맞는/틀린지","②","③","④","⑤"],"explanation":"한국어 해설"}',
  },
  awkward_word: {
    label: '어휘(어색한 단어) 5지선다',
    instruction: (k) => `Choose FIVE single words (or very short phrases, max 2 words) from the passage, in the order they appear, that are meaningful content words (adjectives, adverbs, verbs, nouns) central to the argument.
Exactly mark number ${k} must be given a "replace": a word of the same part of speech/form that makes the sentence clearly illogical in context (usually the opposite meaning of the original) while remaining grammatical. The other four marks must NOT have "replace".
Each "target" must be copied EXACTLY from the passage. Use the occurrence order in the passage.`,
    shape: '{"marks":[{"target":"..."},{"target":"...","replace":"..."},{"target":"..."},{"target":"..."},{"target":"..."}],"reasonOptions":["정답인 이유(정답)","그럴듯한 오답 이유","오답 이유","오답 이유"],"choiceNotes":["① 왜 맞는/틀린지","②","③","④","⑤"],"explanation":"한국어 해설: 원래 단어와 왜 어색한지"}',
  },
  awkward_sentence: {
    label: '어색한 문장 고르기(밑줄 5문장)',
    instruction: (k) => `Choose FIVE whole sentences from the passage, in order of appearance, spread across the passage (not the first sentence).
Exactly mark number ${k} must get a "replace": a rewritten version of that sentence that is grammatical but breaks the logical flow (contradicts the surrounding claim or reverses the direction of the argument). The other four marks have NO "replace".
"target" must be the sentence copied EXACTLY from the passage (including its final punctuation).`,
    shape: '{"marks":[{"target":"..."},{"target":"...","replace":"..."},{"target":"..."},{"target":"..."},{"target":"..."}],"reasonOptions":["정답인 이유(정답)","그럴듯한 오답 이유","오답 이유","오답 이유"],"choiceNotes":["보기1 설명(정답)","보기2 설명","보기3 설명","보기4 설명","보기5 설명"],"explanation":"한국어 해설"}',
  },
  pronoun_reference: {
    label: '지칭 대상이 다른 대명사 고르기',
    instruction: (k) => `Choose FIVE underlined pronoun occurrences from the passage, in order of appearance. They may be DIFFERENT words (it, they, them, their, he, she, this, that, those, which, etc.) — what matters is what each refers to.
Four of them must refer to the SAME entity; exactly mark number ${k} must refer to a DIFFERENT entity.
Each "target" must be one real occurrence of a pronoun (single word, copied exactly), and the five occurrences must appear in this order in the passage; never list an occurrence that does not exist.
In "refers", give what each of the five refers to (short English noun phrases).
If the passage does not have five suitable pronouns with this structure, output {"skip":true,"reason":"..."} instead.`,
    shape: '{"marks":[{"target":"it"},{"target":"they"},{"target":"its"},{"target":"it"},{"target":"this"}],"refers":["...","...","...","...","..."],"reasonOptions":["정답인 이유(정답)","그럴듯한 오답 이유","오답 이유","오답 이유"],"choiceNotes":["① 무엇을 가리키는지","②","③","④","⑤"],"explanation":"한국어 해설"}',
  },
  idiom_meaning: {
    label: '관용적 표현의 문맥상 의미',
    instruction: () => `Pick ONE idiomatic or figurative expression/sentence from the passage whose meaning must be inferred from context (metaphor, idiom, figurative sentence). "target" must be copied EXACTLY from the passage.
Give 5 English choices describing what the expression means IN THIS CONTEXT. The FIRST choice must be the correct one; the other four must be plausible but wrong (literal readings, or opposite meanings). Same length and style.`,
    shape: '{"target":"...","choices":["correct","wrong","wrong","wrong","wrong"],"reasonOptions":["정답인 이유(정답)","그럴듯한 오답 이유","오답 이유","오답 이유"],"choiceNotes":["보기1 설명(정답)","보기2 설명","보기3 설명","보기4 설명","보기5 설명"],"explanation":"한국어 해설"}',
  },
  summary_fill: {
    label: '요약문 빈칸 (A)(B)',
    instruction: () => `Write ONE English sentence summarizing the whole passage with two blanks written as (A) and (B).
Give 5 choices, each in the form "wordA - wordB". The FIRST choice must be the correct pair; the others should be plausible but wrong in at least one blank (include opposites or near-synonyms with wrong nuance).`,
    shape: '{"summary":"... (A) ... (B) ...","choices":["correctA - correctB","...","...","...","..."],"reasonOptions":["정답인 이유(정답)","그럴듯한 오답 이유","오답 이유","오답 이유"],"choiceNotes":["보기1 설명(정답)","보기2 설명","보기3 설명","보기4 설명","보기5 설명"],"explanation":"한국어 해설"}',
  },
  topic_ko: {
    label: '주제 고르기 (한글 보기)',
    instruction: () => `Write 5 Korean choices for "the topic of the passage". The FIRST choice must be the correct topic (specific, covers the whole passage). Distractors: too narrow (a detail), too broad, related-but-different, or opposite. Same length and noun-phrase style.`,
    shape: '{"choices":["정답 주제","오답","오답","오답","오답"],"reasonOptions":["정답인 이유(정답)","그럴듯한 오답 이유","오답 이유","오답 이유"],"choiceNotes":["보기1 설명(정답)","보기2 설명","보기3 설명","보기4 설명","보기5 설명"],"explanation":"한국어 해설"}',
  },
  blank_sentence: {
    label: '긴 빈칸 추론 (영문 보기)',
    instruction: () => `Pick ONE long phrase or clause (8-25 words) from the passage that carries the key idea and can be inferred from the rest of the passage. "target" must be copied EXACTLY from the passage.
Give 5 English choices of similar length and grammatical form. The FIRST choice must be the original (or an exact equivalent) of the removed part; the others must be plausible but wrong in meaning (opposite, partial, overgeneralized, off-topic).`,
    shape: '{"target":"...","choices":["correct","wrong","wrong","wrong","wrong"],"reasonOptions":["정답인 이유(정답)","그럴듯한 오답 이유","오답 이유","오답 이유"],"choiceNotes":["보기1 설명(정답)","보기2 설명","보기3 설명","보기4 설명","보기5 설명"],"explanation":"한국어 해설"}',
  },
  mood_change: {
    label: '분위기(심경) 변화',
    instruction: () => `Only valid if the passage shows a change of mood/feeling/atmosphere. Write 5 English choices in the form "adjective → adjective" (e.g. "anxious → relieved"). The FIRST choice must be the correct change; the others should be plausible but wrong (wrong start, wrong end, or reversed).
If the passage has no clear mood change, still produce the best question you can about the atmosphere.`,
    shape: '{"choices":["anxious → relieved","...","...","...","..."],"reasonOptions":["정답인 이유(정답)","그럴듯한 오답 이유","오답 이유","오답 이유"],"choiceNotes":["보기1 설명(정답)","보기2 설명","보기3 설명","보기4 설명","보기5 설명"],"explanation":"한국어 해설"}',
  },
  fact: {
    label: '내용 일치',
    instruction: () => `Write 5 English statements about the passage. The FIRST must be TRUE according to the passage (paraphrased, not copied). The other four must be FALSE (subtle distortions: wrong number, reversed relation, overgeneralization, unmentioned claim).`,
    shape: '{"choices":["true statement","false","false","false","false"],"reasonOptions":["정답인 이유(정답)","그럴듯한 오답 이유","오답 이유","오답 이유"],"choiceNotes":["보기1 설명(정답)","보기2 설명","보기3 설명","보기4 설명","보기5 설명"],"explanation":"한국어 해설"}',
  },
  negative_fact: {
    label: '내용 불일치',
    instruction: () => `Write 5 English statements about the passage. Four must be TRUE according to the passage (paraphrased). The FIRST choice must be the one that does NOT match the passage (subtle distortion). Remember: the FIRST choice is the answer (the mismatching one).`,
    shape: '{"choices":["mismatching statement","true","true","true","true"],"reasonOptions":["정답인 이유(정답)","그럴듯한 오답 이유","오답 이유","오답 이유"],"choiceNotes":["보기1 설명(정답)","보기2 설명","보기3 설명","보기4 설명","보기5 설명"],"explanation":"한국어 해설"}',
  },
};

export function aiTypeLabel(t: AiVariantType): string {
  return SPECS[t].label;
}

// ── AI 호출 ──────────────────────────────────────────────
function parseJsonObject(text: string): Record<string, unknown> | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]) as Record<string, unknown>; } catch { return null; }
}

async function askJson(client: Anthropic, prompt: string, maxTokens = 2000): Promise<Record<string, unknown> | null> {
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  });
  const text = msg.content[0]?.type === 'text' ? msg.content[0].text : '';
  const parsed = parseJsonObject(text);
  if (!parsed) console.warn('[variant-generator] unparsable AI output:', text.slice(0, 300), 'stop:', msg.stop_reason);
  return parsed;
}

function isStringArray(v: unknown, n: number): v is string[] {
  return Array.isArray(v) && v.length === n && v.every((x) => typeof x === 'string' && x.trim().length > 0);
}

// ── 한 유형 출제 + 검증 ───────────────────────────────────
type CoreResult = { variant: GeneratedVariant; raw: Record<string, unknown> } | { skip: string };

async function generateCore(
  client: Anthropic,
  type: AiVariantType,
  passage: string,
  position: number,
): Promise<CoreResult | null> {
  const spec = SPECS[type];
  const prompt = `You are a legendary Korean 내신/수능 English instructor with 20 years of experience, famous for predicting exactly which question types a school will pull from a given passage. You judge with seasoned instinct (촉): what a real teacher writing a 변형문제 would reach for in THIS passage, and what they would never bother with.
Now write ONE "${spec.label}" question from the passage below — but only if a veteran like you would honestly put it on a real exam from this passage.

${spec.instruction(position)}

Rules:
- Work only from the passage. Never invent facts.
- Copy every "target" EXACTLY (same spelling/punctuation) from the passage.
- Judge like that veteran: not every passage suits every question type. If this type would NOT naturally be chosen for this passage (e.g. no real idiom/figurative language, no mood change, too few suitable items), do not force it: output only {"skip":true,"reason":"짧은 한국어 이유"}.
- Explanation must be in Korean, 1-3 sentences.
- "reasonOptions": 4 Korean options answering "왜 이것이 정답인가?". The FIRST is the correct reason (concrete, tied to the passage or the grammar/meaning rule); the other three are plausible but wrong reasons.
- "choiceNotes": 5 short Korean notes, one per choice in the order you listed them (for underlined-mark questions: one per mark ①–⑤). Each says why that choice is the answer or why it is not.

Passage:
"""
${passage}
"""

Output ONLY one JSON object, no markdown:
${spec.shape}`;

  const raw = await askJson(client, prompt);
  if (!raw) return null;
  if (raw.skip === true) {
    return { skip: typeof raw.reason === 'string' ? raw.reason : '지문에 어울리지 않는 유형' };
  }
  const explanation = typeof raw.explanation === 'string' ? raw.explanation : '';

  // ① 밑줄 5개 유형
  if (type === 'grammar_error' || type === 'awkward_word' || type === 'awkward_sentence' || type === 'pronoun_reference') {
    const marks = raw.marks as Mark[] | undefined;
    if (!Array.isArray(marks) || marks.length !== 5 || marks.some((m) => typeof m?.target !== 'string')) {
      console.warn('[variant-generator] reject', type, 'bad marks shape', JSON.stringify(marks)?.slice(0, 200));
      return null;
    }
    if (type !== 'pronoun_reference') {
      // replace 는 정확히 position 번째에만
      const ok = marks.every((m, i) => (i === position - 1 ? typeof m.replace === 'string' && m.replace.trim() && m.replace.trim() !== m.target.trim() : m.replace == null));
      if (!ok) {
        console.warn('[variant-generator] reject', type, 'replace position', position, JSON.stringify(marks).slice(0, 300));
        return null;
      }
    } else {
      marks.forEach((m) => { delete m.replace; });
    }
    const built = buildMarkedPassage(passage, marks);
    if (!built.ok || !validateMarkSequence(built.text, 5)) {
      console.warn('[variant-generator] reject', type, 'error' in built ? built.error : 'sequence');
      return null;
    }
    return { raw, variant: {
      questionType: type,
      payload: { markedPassage: built.text, markCount: 5 },
      choices: CIRCLED.map((c, i) => ({ text: c, isCorrect: i === position - 1 })),
      explanation,
    } };
  }

  // ② 단일 밑줄 + 보기
  if (type === 'idiom_meaning') {
    if (typeof raw.target !== 'string' || !isStringArray(raw.choices, 5)) return null;
    const built = buildMarkedPassage(passage, [{ target: raw.target }]);
    if (!built.ok) return null;
    const placed = placeCorrect(raw.choices, position);
    return { raw, variant: {
      questionType: type,
      payload: { markedPassage: built.text, markCount: 1 },
      choices: placed.texts.map((t, i) => ({ text: t, isCorrect: i + 1 === placed.correctIndex })),
      explanation,
    } };
  }

  // ③ 긴 빈칸
  if (type === 'blank_sentence') {
    if (typeof raw.target !== 'string' || !isStringArray(raw.choices, 5)) return null;
    const words = raw.target.trim().split(/\s+/).length;
    if (words < 5) return null;
    const blanked = blankOut(passage, raw.target);
    if (!blanked.ok) return null;
    const placed = placeCorrect(raw.choices, position);
    return { raw, variant: {
      questionType: type,
      payload: { markedPassage: blanked.text },
      choices: placed.texts.map((t, i) => ({ text: t, isCorrect: i + 1 === placed.correctIndex })),
      explanation,
    } };
  }

  // ④ 요약 빈칸
  if (type === 'summary_fill') {
    if (typeof raw.summary !== 'string' || !isStringArray(raw.choices, 5)) return null;
    if (!raw.summary.includes('(A)') || !raw.summary.includes('(B)')) return null;
    if (!raw.choices.every((c) => /\s[-–—]\s/.test(c))) return null;
    const placed = placeCorrect(raw.choices, position);
    return { raw, variant: {
      questionType: type,
      payload: { passage, summaryTemplate: raw.summary, blankLabels: ['(A)', '(B)'] },
      choices: placed.texts.map((t, i) => ({ text: t, isCorrect: i + 1 === placed.correctIndex })),
      explanation,
    } };
  }

  // ⑤ 지문 + 보기만 (주제 / 분위기 / 일치 / 불일치)
  if (!isStringArray(raw.choices, 5)) return null;
  if (new Set(raw.choices.map((c) => c.trim().toLowerCase())).size !== 5) return null;
  const placed = placeCorrect(raw.choices, position);
  return { raw, variant: {
    questionType: type,
    payload: { passage },
    choices: placed.texts.map((t, i) => ({ text: t, isCorrect: i + 1 === placed.correctIndex })),
    explanation,
  } };
}

/** 코어 결과에 "정답인 이유"와 보기별 해설을 붙인다 (없으면 그 단계만 생략) */
async function generateOne(
  client: Anthropic,
  type: AiVariantType,
  passage: string,
  position: number,
): Promise<GeneratedVariant | { skip: string } | null> {
  const core = await generateCore(client, type, passage, position);
  if (!core) return null;
  if ('skip' in core) return core;
  const { variant, raw } = core;
  const marked = variant.choices.every((c) => CIRCLED.includes(c.text)); // 밑줄형은 보기 번호 = 표시 번호

  if (isStringArray(raw.reasonOptions, 4)) {
    // 정답 이유 위치도 고르게 흩는다
    const placed = placeCorrect(raw.reasonOptions, (position % 4) + 1);
    variant.payload.reason = { options: placed.texts, correct: placed.correctIndex - 1 };
  }
  if (isStringArray(raw.choiceNotes, 5)) {
    // 밑줄형은 표시 순서 그대로, 보기형은 보기와 같이 정답 위치로 옮긴다
    variant.payload.choiceNotes = marked ? raw.choiceNotes : placeCorrect(raw.choiceNotes, position).texts;
  }
  return variant;
}

// ── 공개 API ─────────────────────────────────────────────
export type VariantGenResult = {
  generated: GeneratedVariant[];
  failed: AiVariantType[];
  /** 지문에 어울리지 않아 AI 가 스스로 건너뛴 유형 */
  skipped: Array<{ type: AiVariantType; reason: string }>;
};

export async function generateVariantQuestions(
  rawPassage: string,
  types: AiVariantType[],
  seed = Date.now() % 1000,
): Promise<VariantGenResult> {
  const passage = passageForQuestions(rawPassage);
  if (passage.split(/\s+/).length < 40) return { generated: [], failed: types, skipped: [] };

  const client = getClient();
  const positions = targetPositions(types.length, seed);

  const settled = await Promise.all(
    types.map(async (t, i) => {
      // 검증 실패 시 1회 재시도
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const g = await generateOne(client, t, passage, positions[i]);
          if (g) return g; // 문제 또는 { skip } (건너뜀은 재시도하지 않는다)
        } catch (e) {
          console.error('[variant-generator]', t, e);
        }
      }
      return null;
    }),
  );

  const generated: GeneratedVariant[] = [];
  const failed: AiVariantType[] = [];
  const skipped: Array<{ type: AiVariantType; reason: string }> = [];
  settled.forEach((g, i) => {
    if (!g) failed.push(types[i]);
    else if ('skip' in g) skipped.push({ type: types[i], reason: g.skip });
    else generated.push(g);
  });
  return { generated, failed, skipped };
}

/** 지문 특징에 맞는 출제 유형 추천 (이유 포함) */
export async function recommendVariantTypes(
  rawPassage: string,
): Promise<Array<{ type: AiVariantType; reason: string }>> {
  const passage = passageForQuestions(rawPassage);
  const list = AI_VARIANT_TYPES.map((t) => `- ${t}: ${SPECS[t].label}`).join('\n');
  try {
    const raw = await askJson(
      getClient(),
      `You are a legendary Korean 내신/수능 English instructor with 20 years of experience, famous for predicting exactly which question types a school will pull from a given passage. You judge with seasoned instinct (촉): what a real teacher writing a 변형문제 would reach for in THIS passage, and what they would never bother with.
Tell the teacher which 변형문제 types you would pick for this passage.
Look at the passage features: idioms/figurative language, many pronouns with different referents, a mood/feeling change, a clear topic, numbers/facts, contrast/logical flow, quotable key sentences.
Trust your instinct and pick ONLY the types that genuinely suit this passage — between 3 and 6; do not pad the list with types that do not fit (e.g. skip idiom questions if there is no idiom, skip mood change if there is no change of feeling, skip pronoun questions if pronouns are few). Give a short Korean reason for each (mention the concrete feature you saw).

Types:
${list}

Passage:
"""
${passage}
"""

Output ONLY JSON: {"picks":[{"type":"awkward_word","reason":"..."}]}`,
      1200,
    );
    const picks = raw?.picks;
    if (!Array.isArray(picks)) return [];
    const valid = new Set<string>(AI_VARIANT_TYPES);
    return picks
      .filter((p): p is { type: AiVariantType; reason: string } => valid.has(p?.type) && typeof p?.reason === 'string')
      .slice(0, 6);
  } catch (e) {
    console.error('[recommendVariantTypes]', e);
    return [];
  }
}

// ── 지문 배열(순서) — 코드로 결정적 생성 ──────────────────
const PERMS: string[][] = [
  ['A', 'B', 'C'], ['A', 'C', 'B'], ['B', 'A', 'C'],
  ['B', 'C', 'A'], ['C', 'A', 'B'], ['C', 'B', 'A'],
];

/** 문장 배열을 [주어진 글 / 3등분] 으로 나눠 (A)(B)(C) 라벨을 섞어 붙이고 5개 순서 보기를 만든다. */
export function buildTextOrderingVariant(sentences: string[], position: number, seed = 0): GeneratedVariant | null {
  const sents = sentences.map((s) => s.trim()).filter(Boolean);
  if (sents.length < 5) return null;

  const first = Math.max(1, Math.round(sents.length * 0.25));
  const rest = sents.slice(first);
  const size = Math.ceil(rest.length / 3);
  const parts = [0, 1, 2].map((i) => rest.slice(i * size, (i + 1) * size).join(' ')).filter(Boolean);
  if (parts.length !== 3) return null;

  // 원래 순서(parts[0..2]) 에 붙일 라벨 — 항등(A,B,C)이 아닌 순열을 시드로 고른다
  const labelPerm = PERMS.slice(1)[seed % 5];
  const correctOrder = labelPerm; // 원래 순서대로 읽은 라벨 배열
  const segments = ['A', 'B', 'C'].map((label) => ({ id: label, text: parts[correctOrder.indexOf(label)] }));

  const wrong = PERMS.filter((p) => p.join() !== correctOrder.join()).slice(0, 4).map((p) => p.map((l) => `(${l})`).join(' - '));
  const correctText = correctOrder.map((l) => `(${l})`).join(' - ');
  const placed = placeCorrect([correctText, ...wrong], position);

  return {
    questionType: 'text_ordering',
    payload: {
      fixedSegment: { text: sents.slice(0, first).join(' ') },
      segments,
      correctOrder,
    },
    choices: placed.texts.map((t, i) => ({ text: t, isCorrect: i + 1 === placed.correctIndex })),
    explanation: '',
  };
}
