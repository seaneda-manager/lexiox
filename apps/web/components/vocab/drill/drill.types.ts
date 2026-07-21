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
  // 신규 (2026-07): 영어 정의로 단어 고르기 / 듣고 스펠링·뜻 쓰기
  | "DEFINITION_PICK"
  | "LISTEN_SPELL_MEANING"
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
 * Gloss (영어 텍스트 위 뜻 툴팁)
 * - 정의/collocation/예문 안의 내용어에 붙는 작은 뜻 카드용
 * - key는 소문자 표제어, 기능어(and/to/the…)는 애초에 넣지 않는다
 * ==================================================== */

export type GlossEntry = { pos?: string | null; ko: string };
export type GlossMap = Record<string, GlossEntry>;

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

/** 영어 정의를 보고 해당 단어 고르기 */
export type DefinitionPickSeed = {
  definition: string;      // 영어 정의 (문제 본문)
  choices: string[];       // 단어 4지선다
  answer: string;          // 정답 단어
  gloss?: GlossMap;        // 정의 안 내용어 뜻 툴팁
  meta?: {
    wordText?: string;
    meaningKo?: string | null;
    pos?: string | null;
  };
};

/** 듣고 스펠링 + 뜻 쓰기 (입력형) */
export type ListenSpellMeaningSeed = {
  /** TTS로 읽어줄 단어 (화면에는 감춤) */
  spoken: string;
  /** 정답 스펠링 */
  answerSpelling: string;
  /** 정답으로 인정할 한국어 뜻들 */
  acceptedMeaningsKo: string[];
  example_en?: string;
  gloss?: GlossMap;        // 예문 툴팁
  meta?: {
    wordText?: string;
    pos?: string | null;
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
  | DefinitionPickSeed
  | ListenSpellMeaningSeed
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
