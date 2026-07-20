/* ======================================================
   Lingo-X Vocabulary — SSOT (Single Source of Truth)
   DO NOT IMPORT REACT COMPONENTS HERE
====================================================== */

/* ---------- Grade / Band ---------- */
export type GradeBand =
  | "K1_2"
  | "K3_4"
  | "K5_6"
  | "M1_3"
  | "H1_3"
  | "TOEFL"
  | "LIFE"
  | string;

/* ---------- Core Word ---------- */
export type VocabWordCore = {
  id: string;

  text: string;
  lemma: string;
  pos: string;
  is_function_word: boolean;

  meanings_ko: string[];
  meanings_en_simple: string[];

  examples_easy: string[];
  examples_normal: string[];

  derived_terms: string[];

  difficulty: number;
  frequency_score: number | null;
  notes: string | null;

  created_at: string;
  updated_at: string;

  gradeBands: GradeBand[];

  sources: any[];
  semanticTags: any[];
  grammarHints: any[];

  phoneticBrE?: string;
  phoneticNAm?: string;

  // 추가된 속성
  collocations?: string[]; // 단어와 관련된 collocations 추가 (선택적)
};

/* ---------- Pre-screen ---------- */
export type PreScreenSource =
  | "todayNew"
  | "yesterdayReview"
  | "weakReview";

export type PreScreenItem = {
  wordId: string;
  text?: string;
  source: PreScreenSource;
};

export type PreScreenAnswer = {
  wordId: string;
  result: "known" | "unknown";
  fromSource: PreScreenSource;
};

/* ---------- Recall / Learning ---------- */
export type RecallItem = {
  wordId: string;
  reason: "forgot" | "weak" | "review";
};

export type VocabSessionState = {
  userId: string | null;
  mode: "core";
  gradeBand: GradeBand | null;

  todayWordIds: string[];
  knownWordIds: string[];
  unknownWordIds: string[];

  currentIndex: number;
  recallQueue: RecallItem[];
};

/* ---------- PreScreen: Spelling ---------- */
export type SpellingAnswer = {
  wordId: string;
  userInput: string;
  isCorrect: boolean;
};

// 추가된 SpellingResult 타입
export type SpellingResult = {
  spellingFailedIds: string[];
  spellingPassedIds?: string[]; // 이 속성 추가 (선택적)
};
