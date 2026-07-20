// apps/web/models/vocab/index.ts
// LingoX VOCA SSOT

import { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";

/* =========================================================
 * 1. Supabase 기반 원시 타입들
 * ======================================================= */

export type GradeBand = Database["public"]["Enums"]["grade_band"];
export type WordSourceType = Database["public"]["Enums"]["word_source_type"];
export type KnowledgeStatus = Database["public"]["Enums"]["knowledge_status"];
export type GrammarCategory = Database["public"]["Enums"]["grammar_category"];

export type DbWord = Database["public"]["Tables"]["words"]["Row"];
export type DbWordInsert = Database["public"]["Tables"]["words"]["Insert"];
export type DbWordUpdate = Database["public"]["Tables"]["words"]["Update"];

export type DbWordGradeBand = Database["public"]["Tables"]["word_grade_bands"]["Row"];
export type DbWordSource = Database["public"]["Tables"]["word_sources"]["Row"];
export type DbWordGrammarHint = Database["public"]["Tables"]["word_grammar_hints"]["Row"];
export type DbSemanticTag = Database["public"]["Tables"]["semantic_tags"]["Row"];
export type DbWordSemanticTag = Database["public"]["Tables"]["word_semantic_tags"]["Row"];
export type DbUserWordKnowledge = Database["public"]["Tables"]["user_word_knowledge"]["Row"];

/* =========================================================
 * 2. Enum 상수들
 * ======================================================= */

export const GRADE_BANDS: GradeBand[] = ["K1_2", "K3_4", "K5_6", "K7_9", "K10_12", "POST_K12"];

export const WORD_SOURCE_TYPES: WordSourceType[] = [
  "TEXTBOOK",
  "SCHOOL_PRINT",
  "SUNEUNG",
  "MOGOSA",
  "EBS",
  "TOEFL",
  "TOEIC",
  "TEPS",
  "SAT",
  "CUSTOM",
];

export const KNOWLEDGE_STATUSES: KnowledgeStatus[] = ["UNKNOWN", "LEARNING", "KNOWN", "MASTERED"];

export const GRAMMAR_CATEGORIES: GrammarCategory[] = [
  "NONE",
  "BE_VERB",
  "GENERAL_VERB",
  "PRONOUN",
  "ARTICLE",
  "PREPOSITION",
  "CONJUNCTION",
  "RELATIVE_PRONOUN",
];

/* =========================================================
 * 3. 도메인 타입
 * ======================================================= */

export type WordDegreeFields = {
  adj_comp?: string | null;
  adj_sup?: string | null;
  adv_comp?: string | null;
  adv_sup?: string | null;
};

export type VocabWordCore = DbWord &
  WordDegreeFields & {
    gradeBands: GradeBand[];
    sources: DbWordSource[];
    semanticTags: DbSemanticTag[];
    grammarHints: DbWordGrammarHint[];
  };

export type VocabWordWithKnowledge = VocabWordCore & {
  knowledge?: DbUserWordKnowledge | null;
};

export type VocabWordListItem = {
  id: string;
  text: string;
  pos: string | null;
  is_function_word: boolean;
  difficulty: number | null;
  gradeBands: GradeBand[];
  sourcesSummary: string[];
  created_at: string;
};

/* =========================================================
 * 4. Zod 스키마 – 입력(Create/Import)용
 * ======================================================= */

export const zGradeBand = z.enum(GRADE_BANDS as [GradeBand, ...GradeBand[]]);

export const zWordSourceType = z.enum(WORD_SOURCE_TYPES as [WordSourceType, ...WordSourceType[]]);

export const zKnowledgeStatus = z.enum(KNOWLEDGE_STATUSES as [KnowledgeStatus, ...KnowledgeStatus[]]);

export const zGrammarCategory = z.enum(GRAMMAR_CATEGORIES as [GrammarCategory, ...GrammarCategory[]]);

export const zWordSourceInput = z.object({
  sourceType: zWordSourceType,
  sourceLabel: z.string().min(1),
  examYear: z.number().int().min(2000).max(2100).nullable().optional(),
  examMonth: z.number().int().min(1).max(12).nullable().optional(),
  examRound: z.string().nullable().optional(),
  grade: zGradeBand.nullable().optional(),
});

export const zWordGrammarHintInput = z.object({
  grammarCategory: zGrammarCategory.default("NONE"),
  shortTipKo: z.string().min(1).max(500),
  shortTipEn: z.string().max(500).nullable().optional(),
  wrongExample: z.string().max(500).nullable().optional(),
  rightExample: z.string().max(500).nullable().optional(),
  showUntilGrade: zGradeBand.nullable().optional(),
  sortOrder: z.number().int().min(0).default(0),
});

/* =========================================================
 * 핵심: Create Payload Base
 * ======================================================= */

const zWordBaseFields = {
  text: z.string().min(1).max(100),
  lemma: z.string().max(100).nullable().optional(),
  pos: z.string().max(50).nullable().optional(),
  is_function_word: z.boolean().default(false),

  // 필수
  meanings_ko: z.array(z.string().min(1).max(200)).min(1),

  // optional + default
  meanings_en_simple: z.array(z.string().min(1).max(300)).optional().default([]),

  examples_easy: z.array(z.string().min(1).max(300)).optional().default([]),

  examples_normal: z.array(z.string().min(1).max(300)).optional().default([]),

  derived_terms: z.array(z.string().min(1).max(100)).optional().default([]),

  difficulty: z.number().int().min(1).max(5).nullable().optional(),
  frequency_score: z.number().nullable().optional(),

  notes: z.string().nullable().optional(),

  /* =======================================================
   * ✅ NEW: Pronunciation / Syn-Ant / Best Example
   * - 모두 optional + default (legacy payload 안전)
   * ===================================================== */

  phonetic: z.string().max(100).nullable().optional().default(null),
  audioUrl: z.string().max(500).nullable().optional().default(null),

  // meaning-indexed (synonyms_ko[0] corresponds to meanings_ko[0])
  synonyms_ko: z.array(z.array(z.string().min(1).max(100))).optional().default([]),

  antonyms_ko: z.array(z.array(z.string().min(1).max(100))).optional().default([]),

  example_en: z.string().max(500).nullable().optional().default(null),
  example_ko: z.string().max(500).nullable().optional().default(null),

  /* =======================================================
   * ✅ NEW: Degrees (Comparative/Superlative)
   * - adj_comp / adj_sup / adv_comp / adv_sup
   * - optional + default(null) : legacy payload 안전
   * ===================================================== */

  adj_comp: z.string().max(120).nullable().optional().default(null),
  adj_sup: z.string().max(120).nullable().optional().default(null),
  adv_comp: z.string().max(120).nullable().optional().default(null),
  adv_sup: z.string().max(120).nullable().optional().default(null),
};

/* =========================================================
 * Create / Update Payload
 * ======================================================= */

export const zWordCreatePayload = z.object({
  ...zWordBaseFields,
  gradeBands: z.array(zGradeBand).default([]),
  sources: z.array(zWordSourceInput).default([]),
  semanticTagIds: z.array(z.string().uuid()).default([]),
  grammarHints: z.array(zWordGrammarHintInput).default([]),
});

export type WordCreatePayload = z.infer<typeof zWordCreatePayload>;

export const zWordUpdatePayload = zWordCreatePayload.extend({
  id: z.string().uuid(),
});

export type WordUpdatePayload = z.infer<typeof zWordUpdatePayload>;

/* =========================================================
 * 5. DB Row → 도메인 변환
 * ======================================================= */

export type VocabWordQueryResult = DbWord &
  WordDegreeFields & {
    word_grade_bands?: DbWordGradeBand[] | null;
    word_sources?: DbWordSource[] | null;
    word_semantic_tags?: (DbWordSemanticTag & {
      semantic_tags?: DbSemanticTag | null;
    })[] | null;
    word_grammar_hints?: DbWordGrammarHint[] | null;
  };

export function mapToVocabWordCore(row: VocabWordQueryResult): VocabWordCore {
  return {
    ...row,
    gradeBands: (row.word_grade_bands ?? []).map((g) => g.grade),
    sources: row.word_sources ?? [],
    semanticTags: (row.word_semantic_tags ?? [])
      .map((wst) => wst.semantic_tags)
      .filter((t): t is DbSemanticTag => !!t),
    grammarHints: row.word_grammar_hints ?? [],
  };
}

/* =========================================================
 * 6. LingoX 학습 엔진 타입
 * ======================================================= */

export type PreScreenSource = "todayNew" | "yesterdayReview";
export type PreScreenResult = "known" | "unknown";

export interface PreScreenItem {
  wordId: string;
  text: string;
  source: PreScreenSource;
}

export interface PreScreenAnswer {
  wordId: string;
  result: PreScreenResult;
  fromSource: PreScreenSource;
}

export type RecallStatus = "pending" | "failed" | "success";

export interface RecallItem {
  wordId: string;
  targetMeaningIndex: number;
  status: RecallStatus;
}

export type LearningMode = "core" | "boost";

export interface VocabSessionState {
  userId: string;
  mode: LearningMode;
  gradeBand: GradeBand | null;

  todayWordIds: string[];
  knownWordIds: string[];
  unknownWordIds: string[];

  currentIndex: number;
  recallQueue: RecallItem[];
}
