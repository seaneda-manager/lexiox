// apps/web/components/vocab/drill/drill.types.ts

/* ======================================================
 * Drill Types (SSOT)
 * - Canonical: SYNONYM, WORD_FORM_PICK, SENTENCE_BLANK, COLLOCATION
 * - Legacy labels kept for backward compatibility
 * ==================================================== */

export type DrillType =
  | "SYNONYM"
  | "WORD_FORM_PICK"
  | "SENTENCE_BLANK"
  | "COLLOCATION"
  // legacy aliases (accept input, avoid TS breakage)
  | "MEANING_SIMILAR"
  | "MEANING_OPPOSITE"
  | "WORD_FORM"
  | "FILL_IN_THE_BLANKS"
  // arrange family (moved to Homework, but kept for older imports)
  | "LISTEN_ARRANGE"
  | "SYLLABLE_ARRANGE"
  | "LISTEN_ARRANGE_SENTENCE";

/* ======================================================
 * Seeds
 * ==================================================== */

export type MeaningMCQSeed = {
  prompt: string;
  stem: string;
  choices: string[];
  answer: string;
  mcqItemId?: string;
  meta?: {
    relation?: "synonym" | "antonym";
    meaningKo?: string | null;
    stemMeaningKo?: string | null;
    kind?: string;
    wordText?: string;
    promptKo?: string;

    // reveal helpers (optional)
    choiceMeaningKoMap?: Record<string, string>;
    choiceMeaningsKo?: string[];
  };
};

export type SentenceBlankSeed = {
  sentence: string;
  choices: string[];
  answer: string;
  sentence_ko?: string;
  meta?: {
    wordText?: string;
    variantUsed?: string;
  };
};

export type CollocationSeed = {
  prompt: string;
  choices: string[];
  answer: string;

  base: string;
  meaning_ko?: string;
  collocationId?: string;

  example_en?: string;
  example_ko?: string;

  meta?: {
    relation?: string | null;
    score?: number | null;
  };
};

export type WordFormKind =
  | "noun_form"
  | "adj_form"
  | "adv_form"
  | "ed_adj_form"
  | "verb_3rd"
  | "verb_past"
  | "verb_pp";

export type WordFormPickSeed =
  | {
      mode: "MCQ";
      prompt: string;
      choices: string[];
      answer: string;
      meta?: {
        lemma?: string;
        kind?: WordFormKind;
        kindLabel?: string;
        meaningKo?: string | null;
        correctValue?: string;
      };
    }
  | {
      mode: "OX";
      prompt: string;
      oxAnswer: "O" | "X";
      meta?: {
        lemma?: string;
        kind?: WordFormKind;
        kindLabel?: string;
        meaningKo?: string | null;
        correctValue?: string;
      };
    };

// Arrange family placeholders (kept only to prevent compile breaks in older code)
export type SyllableArrangeSeed = {
  spoken?: string;
  pieces?: string[];
  answer?: string;
  meta?: Record<string, any>;
};

export type ListenArrangeSeed = {
  spoken?: string;
  pieces?: string[];
  answer?: string;
  meta?: Record<string, any>;
};

export type ListenArrangeSentenceSeed = {
  spoken?: string;
  sentence?: string;
  pieces?: string[];
  answer?: string;
  meta?: Record<string, any>;
};

export type DrillSeed =
  | MeaningMCQSeed
  | SentenceBlankSeed
  | CollocationSeed
  | WordFormPickSeed
  | SyllableArrangeSeed
  | ListenArrangeSeed
  | ListenArrangeSentenceSeed
  | Record<string, any>;

/* ======================================================
 * Task
 * ==================================================== */

export type DrillTask = {
  wordId: string;
  drillType: DrillType;
  seed: DrillSeed;
  taskId?: string;
  meta?: Record<string, any>;
};
