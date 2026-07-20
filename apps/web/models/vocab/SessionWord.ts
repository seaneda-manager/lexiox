// apps/web/models/vocab/SessionWord.ts

export type VocabExample = {
  en: string;
  ko?: string | null;
};

/**
 * ✅ Collocation (backward-compatible)
 * loadSessionWords.ts에서 쓰는 shape:
 * - { id, base, right, meaning_ko, source }
 *
 * 다른 곳에서 쓰는 shape:
 * - { phrase, meaning_ko, example_en, ... }
 */
export type VocabCollocation = {
  id?: string;

  /** left/base word (e.g. "make") */
  base?: string;

  /** right word (e.g. "a decision") */
  right?: string;

  /** full phrase (e.g. "make a decision") */
  phrase?: string;

  meaning_ko?: string | null;
  meaning_en?: string | null;

  example_en?: string | null;
  example_ko?: string | null;

  source?: "db" | "auto" | string;

  [key: string]: any;
};

/**
 * ✅ SessionWord (client-safe + legacy tolerant)
 */
export type SessionWord = {
  id: string;
  text: string;

  lemma?: string | null;
  pos?: string | null;

  meanings_ko?: string[];
  meanings_en_simple?: string[];

  /** legacy single fields (still tolerated) */
  meaning_ko?: string | null;
  meaning_en_simple?: string | null;

  /** examples */
  examples?: VocabExample[];
  examples_easy?: string | string[] | null;
  examples_normal?: string | string[] | null;

  /** synonyms (✅ keep both names for compatibility) */
  synonyms_en_simple?: string[];
  synonyms?: string[]; // legacy alias

  /** antonyms */
  antonyms_terms?: string[];
  antonyms?: string[]; // legacy alias

  /**
   * ✅ IMPORTANT:
   * - Do NOT include string unions here.
   * - Normalized collocations should be object-array, so TS doesn't infer `string | VocabCollocation`.
   */
  collocations?: VocabCollocation[] | null;

  /** optional raw passthrough if some pipeline still stores raw */
  collocations_raw?: any;

  notes?: string | null;

  [key: string]: any;
};

/** Backward-compatible names some files import */
export type SessionWordExample = VocabExample;
export type SessionWordCollocation = VocabCollocation;

/** Older names some files import */
export type VocabExampleRow = VocabExample;
export type VocabCollocationRow = VocabCollocation;
