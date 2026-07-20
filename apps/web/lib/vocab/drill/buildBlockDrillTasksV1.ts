// apps/web/lib/vocab/drill/buildBlockDrillTasksV1.ts
import type {
  DrillTask,
  DrillType,
  SentenceBlankSeed,
  CollocationSeed,
  WordFormPickSeed,
  WordFormKind,
} from "@/components/vocab/drill/drill.types";

import { autoGenerateCollocationsFromExamples } from "@/lib/vocab/autoCollocations";

/* ======================================================
 * Build Block Drill Tasks v1 (SSOT)
 *
 * v2.7 DROP-IN (THIS FILE):
 * - ✅ Meaning map injection for SYNONYM/MEANING MCQ:
 *   meta.choiceMeaningKoMap + meta.choiceMeaningsKo are attached when possible.
 * - ✅ Set-only enforcement for SYNONYM/ANTONYM:
 *   answer + distractors are restricted to current set (text/lemma/forms),
 *   so meanings resolve much more reliably without lexicon lookup.
 *
 * v2.8 PATCH:
 * - ✅ WORD_FORM_PICK: past tense / past participle questions are asked ONLY for irregular verbs.
 *   (Regular-looking past/pp forms are excluded via heuristic regular-form candidates.)
 * ==================================================== */

const DEV_CHEATS = process.env.NEXT_PUBLIC_DEV_CHEATS === "1";

/** ✅ Meaning MCQ seed (runtime shape only, pushed as any into DrillTask union) */
type MeaningMCQSeed = {
  prompt: string;
  stem: string;
  choices: string[];
  answer: string;
  mcqItemId?: string;
  meta?: {
    relation?: "synonym" | "antonym";
    meaningKo?: string | null;
    kind?: string;
    wordText?: string;
    promptKo?: string;

    // ✅ NEW (for DrillRunner reveal panels)
    choiceMeaningKoMap?: Record<string, string>;
    choiceMeaningsKo?: string[];
    stemMeaningKo?: string | null;
  };
};

export type WordFormRowLike = {
  word_id: string;
  lemma: string | null;
  base_pos?: string | null;

  noun_form?: string | null;
  adj_form?: string | null;
  adv_form?: string | null;
  ed_adj_form?: string | null;

  verb_3rd?: string | null;
  verb_past?: string | null;
  verb_pp?: string | null;

  verb_ing?: string | null;

  noun_meaning_ko?: string | null;
  adj_meaning_ko?: string | null;
  adv_meaning_ko?: string | null;
  ed_adj_meaning_ko?: string | null;
};

export type WordExampleLike = { en: string; ko?: string | null };
export type WordExampleInput = WordExampleLike[] | string[] | null | undefined;

/**
 * ✅ Collocation row compatibility:
 * - legacy: { base, right }
 * - loader(VocabCollocation): { base, collocate }
 */
export type CollocationPairLike = {
  id?: string | null;
  base: string;
  right?: string; // preferred
  collocate?: string; // accepted
  meaning_ko?: string | null;
  relation?: string | null;
  score?: number | null;
};

type Input = {
  wordIds: string[];
  drillTypes: Array<DrillType | string>;
  shuffleWordsWithinEachBlock?: boolean;

  getWordText?: (wordId: string) => string | undefined;
  getWordForm?: (wordId: string) => WordFormRowLike | undefined;

  getWordMeaningsKo?: (wordId: string) => string[] | string | null | undefined;

  getWordSynonyms?: (wordId: string) => any;
  getWordAntonyms?: (wordId: string) => any;

  getWordExamples?: (wordId: string) => WordExampleInput;

  getWordCollocations?: (
    wordId: string,
  ) => CollocationPairLike[] | string[] | null | undefined;
};

const DEFAULT_DRILL_TYPES: DrillType[] = [
  "SYNONYM",
  "WORD_FORM_PICK",
  "SENTENCE_BLANK",
  "COLLOCATION",
];

function normalizeDrillType(dt: unknown): DrillType | null {
  const k = String(dt ?? "").trim().toUpperCase();
  if (!k) return null;

  // aliases
  if (k === "WORD_FORM") return "WORD_FORM_PICK";
  if (k === "FILL_IN_THE_BLANKS") return "SENTENCE_BLANK";

  // legacy meaning labels -> canonical
  if (k === "MEANING_SIMILAR") return "SYNONYM";
  if (k === "MEANING_OPPOSITE") return "SYNONYM";

  // explicit
  if (k === "SYNONYM") return "SYNONYM";
  if (k === "WORD_FORM_PICK") return "WORD_FORM_PICK";
  if (k === "SENTENCE_BLANK") return "SENTENCE_BLANK";
  if (k === "COLLOCATION") return "COLLOCATION";

  // ignore arrange family (moved to Homework)
  if (
    k === "LISTEN_ARRANGE" ||
    k === "SYLLABLE_ARRANGE" ||
    k === "LISTEN_ARRANGE_SENTENCE"
  ) {
    return null;
  }

  return null;
}

function cleanStr(v: unknown): string {
  return String(v ?? "").trim();
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function uniqKeepOrder(arr: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of arr) {
    const v = cleanStr(x);
    if (!v) continue;
    const k = v.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out;
}

/** ✅ accepts: string | string[] | string[][] | [string,string][] | anything */
function normalizeToStringArrayDeep(v: any): string[] {
  if (v == null) return [];

  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return [];
    return s
      .split(/\n|;|\/|\|/g)
      .map((x) => x.trim())
      .filter(Boolean);
  }

  if (Array.isArray(v)) {
    const out: string[] = [];
    for (const item of v) {
      if (item == null) continue;
      if (typeof item === "string") {
        const s = item.trim();
        if (s) out.push(s);
        continue;
      }
      if (Array.isArray(item)) {
        for (const sub of item) {
          const s = cleanStr(sub);
          if (s) out.push(s);
        }
        continue;
      }
    }
    return out.map(cleanStr).filter(Boolean);
  }

  return [];
}

function normalizeMeaningKo(v: any): string | undefined {
  const parts = normalizeToStringArrayDeep(v);
  return parts.length ? parts.join(" / ") : undefined;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function blankOutWord(sentence: string, word: string) {
  const s = cleanStr(sentence);
  const w = cleanStr(word);
  if (!s || !w) return { blanked: s, didBlank: false };

  const re = new RegExp(`\\b${escapeRegExp(w)}\\b`, "gi");
  if (!re.test(s)) return { blanked: s, didBlank: false };

  return { blanked: s.replace(re, "___"), didBlank: true };
}

function normalizeExamples(examples: WordExampleInput): WordExampleLike[] {
  if (!examples) return [];
  if (!Array.isArray(examples)) return [];

  const first = examples[0] as any;

  if (typeof first === "string") {
    return (examples as string[])
      .map((s) => cleanStr(s))
      .filter(Boolean)
      .map((en) => ({ en }));
  }

  if (typeof first === "object" && first && "en" in first) {
    return (examples as any[])
      .map((x) => ({
        en: cleanStr(x?.en),
        ko: cleanStr(x?.ko) || undefined,
      }))
      .filter((x) => Boolean(x.en));
  }

  return [];
}

/**
 * ✅ 예문 선택:
 * - variants 중 하나라도 문장에 포함되면 OK
 * - 없으면 null
 */
function pickBestExampleByVariants(
  examplesInput: WordExampleInput,
  variants: string[],
) {
  const list = normalizeExamples(examplesInput);
  if (list.length === 0) return null;

  const vars = uniqKeepOrder(variants.map(cleanStr).filter(Boolean));
  if (vars.length === 0) return list[0] ?? null;

  for (const ex of list) {
    const en = cleanStr(ex?.en);
    if (!en) continue;

    for (const v of vars) {
      const re = new RegExp(`\\b${escapeRegExp(v)}\\b`, "i");
      if (re.test(en)) return ex;
    }
  }

  return null;
}

function parseCollocationString(s: string): CollocationPairLike | null {
  const raw = cleanStr(s);
  if (!raw) return null;

  if (raw.includes("|")) {
    const [a, b] = raw.split("|").map((x) => x.trim());
    if (a && b) return { base: a, right: b };
  }

  if (raw.includes("___")) {
    const [a, b] = raw.split("___").map((x) => x.trim());
    if (a && b) return { base: a, right: b };
  }

  const tokens = raw.split(/\s+/).filter(Boolean);
  if (tokens.length >= 2) {
    return { base: tokens[0]!, right: tokens.slice(1).join(" ") };
  }

  return null;
}

/**
 * ✅ Normalize collocations:
 * - {base,right} ✅
 * - {base,collocate} ✅
 * - string[] like "make|decision"
 */
function normalizeCollocationPairs(
  v: CollocationPairLike[] | string[] | null | undefined,
) {
  if (!v) return [];

  if (Array.isArray(v) && v.length > 0) {
    const first = v[0] as any;

    if (typeof first === "object" && first) {
      return (v as any[])
        .map((x) => {
          const base = cleanStr(x?.base ?? x?.left ?? x?.word ?? "");
          const right = cleanStr(
            x?.right ??
              x?.collocate ??
              x?.value ??
              x?.text ??
              x?.rhs ??
              "",
          );
          const id = cleanStr(x?.id) || undefined;
          const meaning_ko =
            cleanStr(x?.meaning_ko ?? x?.meaningKo ?? "") || undefined;

          if (!base || !right) return null;

          return {
            id,
            base,
            right,
            meaning_ko,
            relation: cleanStr(x?.relation ?? x?.type ?? x?.kind ?? "") || undefined,
            score:
              typeof x?.score === "number"
                ? x.score
                : Number.isFinite(Number(x?.score))
                  ? Number(x?.score)
                  : undefined,
          } as CollocationPairLike;
        })
        .filter(
          (x): x is CollocationPairLike =>
            Boolean(x && x.base && (x.right || x.collocate)),
        )
        .map((x) => ({ ...x, right: cleanStr(x.right ?? x.collocate ?? "") }))
        .filter((x) => x.base && x.right);
    }

    if (typeof first === "string") {
      return (v as string[])
        .map(parseCollocationString)
        .filter(
          (x): x is CollocationPairLike =>
            Boolean(x && x.base && (x.right || x.collocate)),
        )
        .map((x) => ({ ...x, right: cleanStr(x.right ?? x.collocate ?? "") }))
        .filter((x) => x.base && x.right);
    }
  }

  return [];
}

/** ✅ lemma-only row 제외 (실제 form 값이 있어야 pool에 넣음) */
function hasAnyWordFormValue(r: WordFormRowLike | undefined | null) {
  if (!r) return false;
  const vals = [
    r.noun_form,
    r.adj_form,
    r.adv_form,
    r.ed_adj_form,
    r.verb_3rd,
    r.verb_past,
    r.verb_pp,
    (r as any).verb_ing,
  ]
    .map((x) => cleanStr(x))
    .filter(Boolean);
  return vals.length > 0;
}

/** ✅ choice pool helper (text-only, used by meaning-to-word and some fallbacks) */
function buildChoicesFromPool(
  correct: string,
  wordIds: string[],
  getWordTextAny: ((id: string) => string | undefined) | undefined,
  count: number,
): string[] {
  const pool: string[] = [];

  for (const id of wordIds) {
    const t = (getWordTextAny?.(id) ?? "").trim();
    if (t) pool.push(t);
  }

  const uniq = Array.from(new Set(pool.filter(Boolean)));
  const distractors = shuffle(uniq.filter((x) => x && x !== correct)).slice(
    0,
    Math.max(0, count - 1),
  );

  const base = [correct || "", ...distractors].filter(Boolean);
  if (base.length === 0) return ["_"];

  while (base.length < count) base.push(base[base.length - 1]!);
  return shuffle(base).slice(0, count);
}

/* ======================================================
 * ✅ Irregular-only past/pp helpers (NEW)
 * ==================================================== */

function normLower(s: unknown) {
  return cleanStr(s).toLowerCase();
}

function isVowelChar(c: string) {
  return ["a", "e", "i", "o", "u"].includes(c);
}

function isAlphaWord(s: string) {
  return /^[a-z]+$/i.test(s);
}

/**
 * Heuristic: build "regular past tense" candidates from lemma.
 */
function regularPastCandidates(lemmaRaw: string): Set<string> {
  const lemma = normLower(lemmaRaw);
  const out = new Set<string>();
  if (!lemma) return out;

  if (!isAlphaWord(lemma)) {
    out.add(`${lemma}ed`);
    if (lemma.endsWith("e")) out.add(`${lemma}d`);
    return out;
  }

  out.add(`${lemma}ed`);

  if (lemma.endsWith("e")) out.add(`${lemma}d`);

  if (lemma.length >= 2) {
    const last = lemma[lemma.length - 1]!;
    const prev = lemma[lemma.length - 2]!;
    if (last === "y" && !isVowelChar(prev)) {
      out.add(`${lemma.slice(0, -1)}ied`);
    }
  }

  if (lemma.endsWith("c")) out.add(`${lemma}ked`);

  if (lemma.length >= 3) {
    const a = lemma[lemma.length - 3]!;
    const b = lemma[lemma.length - 2]!;
    const c = lemma[lemma.length - 1]!;
    const lastIsConsonant = !isVowelChar(c);
    const midIsVowel = isVowelChar(b);
    const firstIsConsonant = !isVowelChar(a);
    const blockDouble = ["w", "x", "y"].includes(c);
    if (firstIsConsonant && midIsVowel && lastIsConsonant && !blockDouble) {
      out.add(`${lemma}${c}ed`);
    }
  }

  if (lemma.endsWith("l")) {
    out.add(`${lemma}ed`);
    out.add(`${lemma}led`);
  }

  return out;
}

function isIrregularPastLike(lemmaRaw: string, formRaw?: string | null) {
  const lemma = cleanStr(lemmaRaw);
  const form = cleanStr(formRaw);
  if (!lemma || !form) return false;

  const formLower = form.toLowerCase();
  const candidates = regularPastCandidates(lemma);

  for (const c of candidates) {
    if (formLower === c.toLowerCase()) return false;
  }
  return true;
}

/* ======================================================
 * ✅ Meaning map helpers
 * ==================================================== */

function normKey(s: string) {
  return String(s ?? "").trim().toLowerCase();
}

function addMeaningKey(
  map: Map<string, string>,
  keyRaw: unknown,
  meaningRaw: unknown,
) {
  const key = cleanStr(keyRaw);
  const meaning = cleanStr(meaningRaw);
  if (!key || !meaning) return;

  const k = normKey(key);
  if (!k) return;

  if (!map.has(k)) map.set(k, meaning);
}

function buildChoiceMeaningMeta(
  choices: string[],
  resolve: (choiceText: string) => string,
) {
  const choiceMeaningsKo = (choices ?? []).map((c) => cleanStr(resolve(c)));

  const choiceMeaningKoMap: Record<string, string> = {};
  for (let i = 0; i < (choices ?? []).length; i++) {
    const c = cleanStr(choices[i]);
    if (!c) continue;
    const m = cleanStr(choiceMeaningsKo[i]);
    if (!m) continue;
    choiceMeaningKoMap[normKey(c)] = m;
  }

  return { choiceMeaningsKo, choiceMeaningKoMap };
}

/* ======================================================
 * ✅ Set-only helpers
 * ==================================================== */

function addKey(set: Set<string>, v: unknown) {
  const s = cleanStr(v);
  if (!s) return;
  set.add(normKey(s));
}

function buildSetKeySet(params: {
  ids: string[];
  getWordTextSafe: (id: string) => string | undefined;
  getWordForm?: (id: string) => WordFormRowLike | undefined;
}) {
  const { ids, getWordTextSafe, getWordForm } = params;
  const set = new Set<string>();

  for (const id of ids ?? []) {
    const wf = getWordForm?.(id);

    addKey(set, getWordTextSafe(id));
    addKey(set, wf?.lemma);

    addKey(set, wf?.noun_form);
    addKey(set, wf?.adj_form);
    addKey(set, wf?.adv_form);
    addKey(set, wf?.ed_adj_form);

    addKey(set, wf?.verb_3rd);
    addKey(set, wf?.verb_past);
    addKey(set, wf?.verb_pp);
    addKey(set, (wf as any)?.verb_ing);
  }

  return set;
}

function buildSetChoicePool(params: {
  ids: string[];
  getWordTextSafe: (id: string) => string | undefined;
  getWordForm?: (id: string) => WordFormRowLike | undefined;
}) {
  const { ids, getWordTextSafe, getWordForm } = params;
  const pool: string[] = [];

  for (const id of ids ?? []) {
    const wf = getWordForm?.(id);

    const push = (v: unknown) => {
      const s = cleanStr(v);
      if (s) pool.push(s);
    };

    push(getWordTextSafe(id));
    push(wf?.lemma);

    push(wf?.noun_form);
    push(wf?.adj_form);
    push(wf?.adv_form);
    push(wf?.ed_adj_form);

    push(wf?.verb_3rd);
    push(wf?.verb_past);
    push(wf?.verb_pp);
    push((wf as any)?.verb_ing);
  }

  return uniqKeepOrder(pool);
}

function ensureMinCount(arr: string[], n: number) {
  const out = [...arr];
  if (out.length === 0) return out;
  while (out.length < n) out.push(out[out.length - 1]!);
  return out;
}

/* ======================================================
 * ✅ MEANING builders (seed only)
 * ==================================================== */

function buildMeaningToWordMCQSeed(params: {
  wordText: string;
  meaningsKo: string[];
  wordIds: string[];
  getWordTextAny?: (id: string) => string | undefined;
  resolveChoiceMeaningKo?: (choiceText: string) => string;
}): MeaningMCQSeed | null {
  const { wordText, meaningsKo, wordIds, getWordTextAny, resolveChoiceMeaningKo } =
    params;

  const promptKo = meaningsKo.map(cleanStr).filter(Boolean)[0] ?? "";
  if (!promptKo) return null;
  if (!wordText) return null;

  const choices = buildChoicesFromPool(wordText, wordIds, getWordTextAny, 4);
  if (choices.length < 2) return null;

  const injected = resolveChoiceMeaningKo
    ? buildChoiceMeaningMeta(choices, resolveChoiceMeaningKo)
    : null;

  return {
    prompt: `Choose the word that matches this meaning:`,
    stem: promptKo,
    choices,
    answer: wordText,
    meta: {
      kind: "MEANING_TO_WORD",
      promptKo,
      wordText,
      meaningKo: promptKo,
      stemMeaningKo: promptKo,
      ...(injected
        ? {
            choiceMeaningKoMap: injected.choiceMeaningKoMap,
            choiceMeaningsKo: injected.choiceMeaningsKo,
          }
        : {}),
    },
  };
}

function buildSynonymMCQSeed(params: {
  wordId: string;
  wordText: string;
  synonyms: string[];

  wordIds?: string[];
  getWordSynonyms?: (id: string) => any;
  getWordTextAny?: (id: string) => string | undefined;

  meaningKo?: string | null;
  resolveChoiceMeaningKo?: (choiceText: string) => string;

  setKeySet: Set<string>;
  setChoicePool: string[];
}): MeaningMCQSeed | null {
  const {
    wordText,
    synonyms,
    meaningKo,
    resolveChoiceMeaningKo,
    setKeySet,
    setChoicePool,
  } = params;
  if (!wordText) return null;

  const synAll = uniqKeepOrder(synonyms.map(cleanStr).filter(Boolean)).filter(
    (s) => s.toLowerCase() !== wordText.toLowerCase(),
  );
  if (synAll.length === 0) return null;

  const synInSet = synAll.filter((s) => setKeySet.has(normKey(s)));
  if (synInSet.length === 0) return null;

  const answer = synInSet[Math.floor(Math.random() * synInSet.length)]!;
  if (!answer) return null;

  const distractorPool = setChoicePool
    .filter((x) => x.toLowerCase() !== answer.toLowerCase())
    .filter((x) => x.toLowerCase() !== wordText.toLowerCase());

  const distractors = shuffle(distractorPool).slice(0, 3);
  const base = uniqKeepOrder([answer, ...distractors]);
  const choices = shuffle(ensureMinCount(base, 4)).slice(0, 4);
  if (choices.length < 2) return null;

  const injected = resolveChoiceMeaningKo
    ? buildChoiceMeaningMeta(choices, resolveChoiceMeaningKo)
    : null;

  return {
    prompt: "Choose the closest synonym:",
    stem: wordText,
    choices,
    answer,
    meta: {
      relation: "synonym",
      meaningKo: meaningKo ?? null,
      stemMeaningKo: meaningKo ?? null,
      wordText,
      ...(injected
        ? {
            choiceMeaningKoMap: injected.choiceMeaningKoMap,
            choiceMeaningsKo: injected.choiceMeaningsKo,
          }
        : {}),
    },
  };
}

function buildAntonymMCQSeed(params: {
  wordId: string;
  wordText: string;
  antonyms: string[];

  wordIds?: string[];
  getWordAntonyms?: (id: string) => any;
  getWordTextAny?: (id: string) => string | undefined;

  meaningKo?: string | null;
  resolveChoiceMeaningKo?: (choiceText: string) => string;

  setKeySet: Set<string>;
  setChoicePool: string[];
}): MeaningMCQSeed | null {
  const {
    wordText,
    antonyms,
    meaningKo,
    resolveChoiceMeaningKo,
    setKeySet,
    setChoicePool,
  } = params;
  if (!wordText) return null;

  const antAll = uniqKeepOrder(antonyms.map(cleanStr).filter(Boolean)).filter(
    (s) => s.toLowerCase() !== wordText.toLowerCase(),
  );
  if (antAll.length === 0) return null;

  const antInSet = antAll.filter((s) => setKeySet.has(normKey(s)));
  if (antInSet.length === 0) return null;

  const answer = antInSet[Math.floor(Math.random() * antInSet.length)]!;
  if (!answer) return null;

  const distractorPool = setChoicePool
    .filter((x) => x.toLowerCase() !== answer.toLowerCase())
    .filter((x) => x.toLowerCase() !== wordText.toLowerCase());

  const distractors = shuffle(distractorPool).slice(0, 3);
  const base = uniqKeepOrder([answer, ...distractors]);
  const choices = shuffle(ensureMinCount(base, 4)).slice(0, 4);
  if (choices.length < 2) return null;

  const injected = resolveChoiceMeaningKo
    ? buildChoiceMeaningMeta(choices, resolveChoiceMeaningKo)
    : null;

  return {
    prompt: "Choose the closest antonym:",
    stem: wordText,
    choices,
    answer,
    meta: {
      relation: "antonym",
      meaningKo: meaningKo ?? null,
      stemMeaningKo: meaningKo ?? null,
      wordText,
      ...(injected
        ? {
            choiceMeaningKoMap: injected.choiceMeaningKoMap,
            choiceMeaningsKo: injected.choiceMeaningsKo,
          }
        : {}),
    },
  };
}

export function buildBlockDrillTasksV1(input: Input): DrillTask[] {
  const {
    wordIds,
    drillTypes,
    shuffleWordsWithinEachBlock = true,
    getWordText,
    getWordForm,
    getWordMeaningsKo,
    getWordSynonyms,
    getWordAntonyms,
    getWordExamples,
    getWordCollocations,
  } = input;

  const ids = Array.isArray(wordIds)
    ? wordIds.map((x) => String(x ?? "").trim()).filter(Boolean)
    : [];
  if (ids.length === 0) return [];

  let normalized: DrillType[] = (Array.isArray(drillTypes) ? drillTypes : [])
    .map(normalizeDrillType)
    .filter((x): x is DrillType => Boolean(x));

  if (normalized.length === 0) normalized = DEFAULT_DRILL_TYPES;

  const tasks: DrillTask[] = [];
  const createdWordIds = new Set<string>();

  const getWordTextSafe = (wordId: string): string | undefined => {
    const t = cleanStr(getWordText?.(wordId));
    if (t) return t;

    const wf = getWordForm?.(wordId);
    const lemma = cleanStr(wf?.lemma);
    if (lemma) return lemma;

    return undefined;
  };

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const meaningMap = useMeaningMapWithinSet({
    ids,
    getWordTextSafe,
    getWordForm,
    getWordMeaningsKo,
  });

  const resolveChoiceMeaningKo = (choiceText: string) => {
    const k = normKey(choiceText);
    if (!k) return "";
    return meaningMap.get(k) ?? "";
  };

  const setKeySet = buildSetKeySet({ ids, getWordTextSafe, getWordForm });
  const setChoicePool = buildSetChoicePool({ ids, getWordTextSafe, getWordForm });

  const wfPool: WordFormRowLike[] = [];
  if (getWordForm) {
    for (const id of ids) {
      const row = getWordForm(id);
      if (row && hasAnyWordFormValue(row)) wfPool.push(row);
    }
  }

  let sentenceBlankSkippedNoRealBlank = 0;
  let collocationSkippedNoData = 0;
  let collocationAutoGenerated = 0;

  let synonymCreated = 0;
  let synonymFallbackMeaningToWord = 0;
  let synonymSkipped = 0;

  let antonymCreated = 0;
  let antonymSkipped = 0;

  for (const dt of normalized) {
    const block = shuffleWordsWithinEachBlock ? shuffle(ids) : [...ids];

    for (const wordId of block) {
      const wf = getWordForm?.(wordId);
      const text = cleanStr(getWordTextSafe(wordId)) || "";

      if (dt === "SYNONYM") {
        const meaningKo = normalizeMeaningKo(getWordMeaningsKo?.(wordId)) ?? null;

        const synonyms = normalizeToStringArrayDeep(getWordSynonyms?.(wordId));
        if (synonyms.length > 0) {
          const seed = buildSynonymMCQSeed({
            wordId,
            wordText: text,
            synonyms,
            meaningKo,
            resolveChoiceMeaningKo,
            setKeySet,
            setChoicePool,
          });

          if (seed) {
            tasks.push({ wordId, drillType: "SYNONYM", seed } as any);
            createdWordIds.add(wordId);
            synonymCreated++;
          } else {
            synonymSkipped++;
          }
          continue;
        }

        const antonyms = normalizeToStringArrayDeep(getWordAntonyms?.(wordId));
        if (antonyms.length > 0) {
          const seedA = buildAntonymMCQSeed({
            wordId,
            wordText: text,
            antonyms,
            meaningKo,
            resolveChoiceMeaningKo,
            setKeySet,
            setChoicePool,
          });

          if (seedA) {
            tasks.push({ wordId, drillType: "SYNONYM", seed: seedA } as any);
            createdWordIds.add(wordId);
            antonymCreated++;
            continue;
          } else {
            antonymSkipped++;
          }
        }

        const meaningsKo = normalizeToStringArrayDeep(getWordMeaningsKo?.(wordId));
        const seed2 = buildMeaningToWordMCQSeed({
          wordText: text,
          meaningsKo,
          wordIds: ids,
          getWordTextAny: getWordTextSafe,
          resolveChoiceMeaningKo,
        });

        if (seed2) {
          tasks.push({ wordId, drillType: "SYNONYM", seed: seed2 } as any);
          createdWordIds.add(wordId);
          synonymCreated++;
          synonymFallbackMeaningToWord++;
        } else {
          synonymSkipped++;
        }
        continue;
      }

      if (dt === "WORD_FORM_PICK") {
        const seed = buildWordFormPickSeed({
          wordId,
          wordText: text,
          wf,
          pool: wfPool,
        });

        if (!seed) continue;

        tasks.push({ wordId, drillType: "WORD_FORM_PICK", seed });
        createdWordIds.add(wordId);
        continue;
      }

      if (dt === "SENTENCE_BLANK") {
        const variants = uniqKeepOrder(
          [
            text,
            cleanStr(wf?.lemma),
            cleanStr(wf?.verb_3rd),
            cleanStr(wf?.verb_past),
            cleanStr(wf?.verb_pp),
            cleanStr((wf as any)?.verb_ing),
            cleanStr(wf?.noun_form),
            cleanStr(wf?.adj_form),
            cleanStr(wf?.adv_form),
            cleanStr(wf?.ed_adj_form),
          ].filter(Boolean),
        );

        const ex = pickBestExampleByVariants(getWordExamples?.(wordId), variants);

        if (!ex?.en) {
          const meaningsKo = normalizeToStringArrayDeep(getWordMeaningsKo?.(wordId));
          const seed2 = buildMeaningToWordMCQSeed({
            wordText: text,
            meaningsKo,
            wordIds: ids,
            getWordTextAny: getWordTextSafe,
            resolveChoiceMeaningKo,
          });

          if (seed2) {
            tasks.push({ wordId, drillType: "SYNONYM", seed: seed2 } as any);
            createdWordIds.add(wordId);
            synonymCreated++;
            synonymFallbackMeaningToWord++;
          } else {
            sentenceBlankSkippedNoRealBlank++;
          }
          continue;
        }

        let sentence = cleanStr(ex.en);
        let didBlank = false;

        for (const v of variants) {
          const r = blankOutWord(sentence, v);
          if (r.didBlank) {
            sentence = r.blanked;
            didBlank = true;
            break;
          }
        }

        if (!didBlank || !text) {
          const meaningsKo = normalizeToStringArrayDeep(getWordMeaningsKo?.(wordId));
          const seed2 = buildMeaningToWordMCQSeed({
            wordText: text,
            meaningsKo,
            wordIds: ids,
            getWordTextAny: getWordTextSafe,
            resolveChoiceMeaningKo,
          });

          if (seed2) {
            tasks.push({ wordId, drillType: "SYNONYM", seed: seed2 } as any);
            createdWordIds.add(wordId);
            synonymCreated++;
            synonymFallbackMeaningToWord++;
          } else {
            sentenceBlankSkippedNoRealBlank++;
          }
          continue;
        }

        const choices = buildChoicesFromPool(text, ids, getWordTextSafe, 4);

        const seed: SentenceBlankSeed = {
          sentence,
          choices,
          answer: text || choices[0] || "",
          sentence_ko: cleanStr(ex.ko) || undefined,
        };

        tasks.push({ wordId, drillType: "SENTENCE_BLANK", seed });
        createdWordIds.add(wordId);
        continue;
      }

      if (dt === "COLLOCATION") {
        const pairs = normalizeCollocationPairs(getWordCollocations?.(wordId));
        const meaning_ko = normalizeMeaningKo(getWordMeaningsKo?.(wordId));

        let effectivePairs = pairs;

        if (effectivePairs.length === 0) {
          const exList = normalizeExamples(getWordExamples?.(wordId));
          const examplesEn = exList.map((x) => cleanStr(x.en)).filter(Boolean);

          if (text && examplesEn.length > 0) {
            const phrases = autoGenerateCollocationsFromExamples(text, examplesEn, {
              maxPhrases: 12,
              window: 3,
              minLen: 2,
            });

            const autoPairs = phrases
              .map(parseCollocationString)
              .filter(
                (x): x is CollocationPairLike =>
                  Boolean(x && x.base && (x.right || x.collocate)),
              )
              .map((x) => ({ ...x, right: cleanStr(x.right ?? x.collocate ?? "") }))
              .filter((x) => x.base && x.right);

            if (autoPairs.length > 0) {
              effectivePairs = autoPairs;
              collocationAutoGenerated++;
            }
          }
        }

        if (effectivePairs.length === 0) {
          collocationSkippedNoData++;
          continue;
        }

        const pick = effectivePairs[Math.floor(Math.random() * effectivePairs.length)]!;
        const base = cleanStr(pick.base) || (text || wordId);
        const answerRight = cleanStr(pick.right ?? pick.collocate ?? "");

        if (!base || !answerRight) {
          collocationSkippedNoData++;
          continue;
        }

        const rightsPool = effectivePairs
          .map((p) => cleanStr(p.right ?? p.collocate ?? ""))
          .filter(Boolean);
        const uniqRights = Array.from(new Set(rightsPool)).filter(
          (x) => x && x !== answerRight,
        );

        let distractors = shuffle(uniqRights).slice(0, 3);

        if (distractors.length < 3) {
          const more = buildChoicesFromPool(answerRight, ids, getWordTextSafe, 10)
            .filter((x) => x !== answerRight)
            .slice(0, 3 - distractors.length);
          distractors = [...distractors, ...more];
        }

        const choices = shuffle([answerRight, ...distractors]).slice(0, 4);

        const ex = pickBestExampleByVariants(getWordExamples?.(wordId), [
          base,
          answerRight,
          text,
        ]);

        const seed: CollocationSeed = {
          prompt: `Pick the best match: ${base} ___`,
          choices,
          answer: answerRight,
          base,
          meaning_ko: cleanStr(pick.meaning_ko) || meaning_ko || undefined,
          collocationId: cleanStr(pick.id) || undefined,
          example_en: cleanStr(ex?.en) || undefined,
          example_ko: cleanStr(ex?.ko) || undefined,
        };

        tasks.push({ wordId, drillType: "COLLOCATION", seed });
        createdWordIds.add(wordId);
        continue;
      }
    }
  }

  for (const wordId of ids) {
    if (createdWordIds.has(wordId)) continue;

    const text = cleanStr(getWordTextSafe(wordId)) || "";
    const meaningsKo = normalizeToStringArrayDeep(getWordMeaningsKo?.(wordId));

    const seed2 = buildMeaningToWordMCQSeed({
      wordText: text,
      meaningsKo,
      wordIds: ids,
      getWordTextAny: getWordTextSafe,
      resolveChoiceMeaningKo,
    });

    if (seed2) {
      tasks.push({ wordId, drillType: "SYNONYM", seed: seed2 } as any);
      createdWordIds.add(wordId);
      synonymCreated++;
      synonymFallbackMeaningToWord++;
      continue;
    }

    const choices = buildChoicesFromPool(text, ids, getWordTextSafe, 4);
    const seed: SentenceBlankSeed = {
      sentence: `I try not to ___ at school.`,
      choices,
      answer: text || choices[0] || "",
    };

    tasks.push({ wordId, drillType: "SENTENCE_BLANK", seed } as any);
    createdWordIds.add(wordId);
  }

  if (DEV_CHEATS) {
    console.log("[buildBlockDrillTasksV1] wordIds:", ids.length);
    console.log("[buildBlockDrillTasksV1] wfPool(validForms):", wfPool.length);
    console.log("[buildBlockDrillTasksV1] tasks:", tasks.length);
    console.log(
      "[buildBlockDrillTasksV1] SENTENCE_BLANK skipped(no real blank):",
      sentenceBlankSkippedNoRealBlank,
    );
    console.log(
      "[buildBlockDrillTasksV1] COLLOCATION auto-generated:",
      collocationAutoGenerated,
      "skipped(no data):",
      collocationSkippedNoData,
    );
    console.log(
      "[buildBlockDrillTasksV1] SYNONYM created:",
      synonymCreated,
      "fallback(meaning->word):",
      synonymFallbackMeaningToWord,
      "skipped:",
      synonymSkipped,
      "antonymSeeds:",
      antonymCreated,
      "antonymSkipped:",
      antonymSkipped,
    );
    console.log("[buildBlockDrillTasksV1] meaningMap(keys):", meaningMap.size);
    console.log("[buildBlockDrillTasksV1] setKeySet(keys):", setKeySet.size);
    console.log("[buildBlockDrillTasksV1] setChoicePool(size):", setChoicePool.length);
  }

  return tasks;
}

function useMeaningMapWithinSet(params: {
  ids: string[];
  getWordTextSafe: (id: string) => string | undefined;
  getWordForm?: (id: string) => WordFormRowLike | undefined;
  getWordMeaningsKo?: (id: string) => string[] | string | null | undefined;
}) {
  const { ids, getWordTextSafe, getWordForm, getWordMeaningsKo } = params;

  const map = new Map<string, string>();

  for (const id of ids ?? []) {
    const wf = getWordForm?.(id);
    const meaning = normalizeMeaningKo(getWordMeaningsKo?.(id)) ?? "";

    if (!meaning) continue;

    addMeaningKey(map, getWordTextSafe(id), meaning);
    addMeaningKey(map, wf?.lemma, meaning);

    addMeaningKey(map, wf?.noun_form, meaning);
    addMeaningKey(map, wf?.adj_form, meaning);
    addMeaningKey(map, wf?.adv_form, meaning);
    addMeaningKey(map, wf?.ed_adj_form, meaning);
    addMeaningKey(map, wf?.verb_3rd, meaning);
    addMeaningKey(map, wf?.verb_past, meaning);
    addMeaningKey(map, wf?.verb_pp, meaning);
    addMeaningKey(map, (wf as any)?.verb_ing, meaning);
  }

  return map;
}

/* ======================================================
 * WORD_FORM_PICK builder
 * ==================================================== */

function buildWordFormPickSeed(params: {
  wordId: string;
  wordText: string;
  wf: WordFormRowLike | undefined;
  pool: WordFormRowLike[];
}): WordFormPickSeed | null {
  const { wf, pool, wordText } = params;

  const lemma = cleanStr(wf?.lemma ?? wordText ?? "");
  if (!lemma) return null;

  const targets: Array<{
    kind: WordFormKind;
    label: string;
    value: string;
    meaningKo?: string | null;
  }> = [];

  const pushIf = (
    kind: WordFormKind,
    label: string,
    value?: string | null,
    meaningKo?: string | null,
  ) => {
    const v = cleanStr(value);
    if (!v) return;
    targets.push({ kind, label, value: v, meaningKo: meaningKo ?? null });
  };

  pushIf("noun_form", "noun(명사)", wf?.noun_form, wf?.noun_meaning_ko);
  pushIf("adj_form", "adjective(형용사)", wf?.adj_form, wf?.adj_meaning_ko);
  pushIf("adv_form", "adverb(부사)", wf?.adv_form, wf?.adv_meaning_ko);
  pushIf(
    "ed_adj_form",
    "past-participle adjective(-ed 형용사)",
    wf?.ed_adj_form,
    wf?.ed_adj_meaning_ko,
  );

  pushIf("verb_3rd", "3rd person singular(3인칭 단수)", wf?.verb_3rd, null);

  const pastIsIrregular = isIrregularPastLike(lemma, wf?.verb_past);
  const ppIsIrregular = isIrregularPastLike(lemma, wf?.verb_pp);

  if (pastIsIrregular) {
    pushIf("verb_past", "past tense(과거형)", wf?.verb_past, null);
  }
  if (ppIsIrregular) {
    pushIf("verb_pp", "past participle(p.p.)", wf?.verb_pp, null);
  }

  if (targets.length === 0) return null;

  const pick = targets[Math.floor(Math.random() * targets.length)]!;
  const correct = cleanStr(pick.value);
  if (!correct) return null;

  const meaningKo = cleanStr(pick.meaningKo ?? "");
  const prompt = meaningKo
    ? `${lemma}의 "${meaningKo}" 의미의 ${pick.label} 형은?`
    : `${lemma} 의 ${pick.label} 형은?`;

  const choices = buildWordFormMCQChoices({
    correct,
    kind: pick.kind,
    targets,
    pool,
    desired: 4,
  });

  if (choices.length >= 2) {
    return {
      mode: "MCQ",
      prompt,
      choices,
      answer: correct,
      meta: {
        lemma,
        kind: pick.kind,
        kindLabel: pick.label,
        meaningKo: meaningKo || null,
        correctValue: correct,
      },
    };
  }

  const makeTrue = Math.random() < 0.5;

  let shownValue = correct;
  let oxAnswer: "O" | "X" = "O";

  if (!makeTrue) {
    const wrong =
      pickWrongValue(pool, correct) ||
      pickWrongFromOtherTargets(targets, correct) ||
      "";
    if (wrong && wrong !== correct) {
      shownValue = wrong;
      oxAnswer = "X";
    } else {
      shownValue = correct;
      oxAnswer = "O";
    }
  }

  const oxPrompt = `${lemma}의 ${pick.label} 형은 ${shownValue} 이다.  O/X`;

  return {
    mode: "OX",
    prompt: oxPrompt,
    oxAnswer,
    meta: {
      lemma,
      kind: pick.kind,
      kindLabel: pick.label,
      meaningKo: meaningKo || null,
      correctValue: correct,
    },
  };
}

function buildWordFormMCQChoices(params: {
  correct: string;
  kind: WordFormKind;
  targets: Array<{ value: string }>;
  pool: WordFormRowLike[];
  desired: number;
}): string[] {
  const { correct, kind, targets, pool, desired } = params;

  const out: string[] = [];
  const seen = new Set<string>();

  const push = (v: unknown) => {
    const s = cleanStr(v);
    if (!s) return;
    if (seen.has(s)) return;
    seen.add(s);
    out.push(s);
  };

  push(correct);

  {
    const sameKind = collectValuesByKind(pool, kind)
      .map(cleanStr)
      .filter((v) => v && v !== correct);
    for (const v of shuffle(Array.from(new Set(sameKind)))) {
      if (out.length >= desired) break;
      push(v);
    }
  }

  {
    const local = targets
      .map((t) => cleanStr((t as any).value))
      .filter((v) => v && v !== correct);
    for (const v of shuffle(Array.from(new Set(local)))) {
      if (out.length >= desired) break;
      push(v);
    }
  }

  if (out.length < desired) {
    const any = pickWrongValueMany(pool, correct);
    for (const v of shuffle(any)) {
      if (out.length >= desired) break;
      push(v);
    }
  }

  const final = out.filter(Boolean);
  if (final.length < 2) return final;

  const sliceTo = Math.min(desired, final.length);
  return shuffle(final.slice(0, sliceTo));
}

function collectValuesByKind(pool: WordFormRowLike[], kind: WordFormKind): string[] {
  const out: string[] = [];
  for (const r of pool) {
    const v = getValueByKind(r, kind);
    if (v) out.push(v);
  }
  return out;
}

function getValueByKind(r: WordFormRowLike, kind: WordFormKind): string {
  const pick = (x: unknown) => cleanStr(x);
  switch (kind) {
    case "noun_form":
      return pick(r.noun_form);
    case "adj_form":
      return pick(r.adj_form);
    case "adv_form":
      return pick(r.adv_form);
    case "ed_adj_form":
      return pick(r.ed_adj_form);
    case "verb_3rd":
      return pick(r.verb_3rd);
    case "verb_past":
      return pick(r.verb_past);
    case "verb_pp":
      return pick(r.verb_pp);
    default:
      return "";
  }
}

function pickWrongValueMany(pool: WordFormRowLike[], correct: string): string[] {
  const cand: string[] = [];
  for (const r of pool) {
    const vals = [
      r.noun_form,
      r.adj_form,
      r.adv_form,
      r.ed_adj_form,
      r.verb_3rd,
      r.verb_past,
      r.verb_pp,
      (r as any).verb_ing,
    ]
      .map((x) => cleanStr(x))
      .filter(Boolean);

    for (const v of vals) if (v && v !== correct) cand.push(v);
  }
  return Array.from(new Set(cand)).filter(Boolean);
}

function pickWrongValue(pool: WordFormRowLike[], correct: string): string {
  return shuffle(pickWrongValueMany(pool, correct))[0] ?? "";
}

function pickWrongFromOtherTargets(
  targets: Array<{ value: string }>,
  correct: string,
): string {
  const cand = targets
    .map((t) => cleanStr((t as any).value))
    .filter((v) => v && v !== correct);
  return shuffle(Array.from(new Set(cand)))[0] ?? "";
}
