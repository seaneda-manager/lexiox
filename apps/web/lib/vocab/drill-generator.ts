// lib/vocab/drill-generator.ts
// 단어 → 드릴 문항 생성 (룰 베이스, AI 불필요)
//
// 설계 원칙 (project_vocab_drill_redesign):
// - 6종: 듣고쓰기 / 활용형 / 동의어 / 반의어 / collocation / 영어정의
// - "있는 데이터만 문항화" — 필드가 비면 그 타입은 그냥 건너뛴다
// - 같은 단어를 여러 렌즈로 인출 (varied retrieval)
// - 청크 4단어 단위로 묶어 공급

import type {
  DrillTask,
  DrillType,
  GlossMap,
} from "@/components/vocab/drill/drill.types";

export type GenWord = {
  id: string;
  text: string;
  pos?: string | null;
  meaningsKo: string[];
  meaningsEnSimple: string[];
  synonyms: string[];
  antonyms: string[];
  collocations: string[];
  examples: string[];
  derivedTerms: string[];
};

export type GenerateOptions = {
  /** 청크당 단어 수 (기본 4 — Cowan 4±1) */
  chunkSize?: number;
  /** 사용할 타입 (미지정 시 전체) */
  types?: DrillType[];
};

export type GeneratedChunk = {
  chunkIndex: number;
  wordIds: string[];
  tasks: DrillTask[];
};

const ALL_TYPES: DrillType[] = [
  "LISTEN_SPELL_MEANING",
  "DEFINITION_PICK",
  "SYNONYM",
  "MEANING_OPPOSITE",
  "COLLOCATION",
  "WORD_FORM_PICK",
];

/** 뜻 툴팁에서 제외할 기능어 */
const FUNCTION_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "if", "of", "to", "in", "on", "at",
  "for", "with", "by", "from", "as", "that", "this", "these", "those", "it",
  "its", "is", "are", "was", "were", "be", "been", "being", "not", "no",
  "so", "than", "then", "there", "here", "into", "out", "up", "down", "over",
  "under", "about", "who", "which", "when", "where", "how", "what",
]);

function norm(s: string): string {
  return String(s ?? "").trim().toLowerCase().replace(/[^a-z'-]/g, "");
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** answer 를 제외한 pool 에서 n개 오답 추출 */
function pickDistractors(pool: string[], answer: string, n: number): string[] {
  const a = norm(answer);
  const uniq = [...new Set(pool.map((x) => String(x ?? "").trim()).filter(Boolean))]
    .filter((x) => norm(x) !== a);
  return shuffle(uniq).slice(0, n);
}

function mcqChoices(answer: string, pool: string[], total = 4): string[] | null {
  const distractors = pickDistractors(pool, answer, total - 1);
  if (distractors.length < total - 1) return null; // 오답이 모자라면 문항 포기
  return shuffle([answer, ...distractors]);
}

/**
 * 영어 텍스트에서 내용어를 뽑아 glossMap 구성.
 * 지금은 "우리 words 안에 있는 단어"만 채운다(런타임 조회 0).
 * 비는 부분은 이후 AI 보강 단계에서 채운다.
 */
export function buildGloss(text: string, lexicon: Map<string, { pos?: string | null; ko: string }>): GlossMap {
  const out: GlossMap = {};
  for (const raw of String(text ?? "").split(/\s+/)) {
    const k = norm(raw);
    if (!k || k.length < 3 || FUNCTION_WORDS.has(k)) continue;
    const hit = lexicon.get(k);
    if (hit) out[k] = { pos: hit.pos ?? null, ko: hit.ko };
  }
  return out;
}

/** 단어 목록 → 표제어 사전 (gloss 채우기용) */
function buildLexicon(words: GenWord[]): Map<string, { pos?: string | null; ko: string }> {
  const m = new Map<string, { pos?: string | null; ko: string }>();
  for (const w of words) {
    const ko = w.meaningsKo?.[0];
    if (!ko) continue;
    m.set(norm(w.text), { pos: w.pos ?? null, ko });
    for (const d of w.derivedTerms ?? []) {
      const k = norm(d);
      if (k && !m.has(k)) m.set(k, { pos: null, ko });
    }
  }
  return m;
}

/** 한 단어에서 만들 수 있는 문항 전부 생성 (데이터 없는 타입은 건너뜀) */
function tasksForWord(
  w: GenWord,
  all: GenWord[],
  lexicon: Map<string, { pos?: string | null; ko: string }>,
  types: DrillType[],
): DrillTask[] {
  const out: DrillTask[] = [];
  const wordPool = all.filter((x) => x.id !== w.id).map((x) => x.text);
  const push = (drillType: DrillType, seed: any) =>
    out.push({ wordId: w.id, drillType, seed, taskId: `${w.id}:${drillType}` });

  // 1) 듣고 스펠링 + 뜻 쓰기 — 단어와 뜻만 있으면 항상 가능
  if (types.includes("LISTEN_SPELL_MEANING") && w.text && w.meaningsKo.length > 0) {
    const ex = w.examples?.[0];
    push("LISTEN_SPELL_MEANING", {
      spoken: w.text,
      answerSpelling: w.text,
      acceptedMeaningsKo: w.meaningsKo,
      example_en: ex ?? undefined,
      gloss: ex ? buildGloss(ex, lexicon) : undefined,
      meta: { wordText: w.text, pos: w.pos ?? null },
    });
  }

  // 2) 영어 정의 → 단어 고르기
  if (types.includes("DEFINITION_PICK") && w.meaningsEnSimple.length > 0) {
    const def = w.meaningsEnSimple[0];
    const choices = mcqChoices(w.text, wordPool);
    if (choices) {
      push("DEFINITION_PICK", {
        definition: def,
        choices,
        answer: w.text,
        gloss: buildGloss(def, lexicon),
        meta: { wordText: w.text, meaningKo: w.meaningsKo[0] ?? null, pos: w.pos ?? null },
      });
    }
  }

  // 3) 동의어
  if (types.includes("SYNONYM") && w.synonyms.length > 0) {
    const answer = w.synonyms[0];
    const pool = all.flatMap((x) => (x.id === w.id ? [] : x.synonyms)).concat(wordPool);
    const choices = mcqChoices(answer, pool);
    if (choices) {
      push("SYNONYM", {
        prompt: w.text,
        stem: w.text,
        choices,
        answer,
        meta: { relation: "synonym", wordText: w.text, meaningKo: w.meaningsKo[0] ?? null },
      });
    }
  }

  // 4) 반의어
  if (types.includes("MEANING_OPPOSITE") && w.antonyms.length > 0) {
    const answer = w.antonyms[0];
    const pool = all.flatMap((x) => (x.id === w.id ? [] : x.antonyms)).concat(wordPool);
    const choices = mcqChoices(answer, pool);
    if (choices) {
      push("MEANING_OPPOSITE", {
        prompt: w.text,
        stem: w.text,
        choices,
        answer,
        meta: { relation: "antonym", wordText: w.text, meaningKo: w.meaningsKo[0] ?? null },
      });
    }
  }

  // 5) collocation — 표현에서 단어를 빈칸으로
  if (types.includes("COLLOCATION") && w.collocations.length > 0) {
    const phrase = w.collocations[0];
    const re = new RegExp(`\\b${w.text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (re.test(phrase)) {
      const choices = mcqChoices(w.text, wordPool);
      if (choices) {
        push("COLLOCATION", {
          prompt: phrase.replace(re, "____"),
          choices,
          answer: w.text,
          base: w.text,
          meaning_ko: w.meaningsKo[0] ?? undefined,
          example_en: phrase,
          gloss: buildGloss(phrase, lexicon),
        });
      }
    }
  }

  // 6) 활용형
  if (types.includes("WORD_FORM_PICK") && w.derivedTerms.length > 0) {
    const answer = w.derivedTerms[0];
    const pool = all.flatMap((x) => (x.id === w.id ? [] : x.derivedTerms)).concat(wordPool);
    const choices = mcqChoices(answer, pool);
    if (choices) {
      push("WORD_FORM_PICK", {
        mode: "MCQ",
        prompt: w.text,
        choices,
        answer,
        meta: { lemma: w.text, meaningKo: w.meaningsKo[0] ?? null, correctValue: answer },
      });
    }
  }

  return out;
}

/**
 * 단어 목록 → 청크(기본 4단어)별 문항 묶음.
 * 한 청크 안에서는 단어들의 문항을 섞어 varied retrieval 이 되게 한다.
 */
export function generateDrillChunks(
  words: GenWord[],
  opts: GenerateOptions = {},
): GeneratedChunk[] {
  const chunkSize = Math.max(1, opts.chunkSize ?? 4);
  const types = opts.types?.length ? opts.types : ALL_TYPES;
  const lexicon = buildLexicon(words);

  const chunks: GeneratedChunk[] = [];
  for (let i = 0; i < words.length; i += chunkSize) {
    const group = words.slice(i, i + chunkSize);
    const tasks = shuffle(group.flatMap((w) => tasksForWord(w, words, lexicon, types)));
    if (tasks.length === 0) continue;
    chunks.push({
      chunkIndex: chunks.length,
      wordIds: group.map((w) => w.id),
      tasks,
    });
  }
  return chunks;
}
