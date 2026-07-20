// Shadowing/L&R/Paraphrase 모드에서 사용할 Stage 설정
// Stage 1-50: 변수들이 복합적으로 증가

export type SpeechSpeed = 0.8 | 0.85 | 0.9 | 0.95 | 1.0 | 1.1 | 1.2 | 1.3 | 1.4 | 1.5;

export type SentenceLength = "word" | "phrase" | "sentence" | "compound" | "complex" | "multi-sentence";

export type VocabularyLevel = "basic" | "common" | "phrasal-verbs" | "idioms" | "advanced" | "academic";

export type Domain = "general" | "professional" | "academic" | "specialized";

export type Enunciation = "very-clear" | "clear" | "natural" | "reduced" | "unclear" | "very-unclear";

export interface StageConfig {
  stage: number;
  speed: SpeechSpeed;
  length: SentenceLength;
  vocabulary: VocabularyLevel;
  domain: Domain;
  enunciation: Enunciation;
  accent?: "american" | "british" | "australian" | "indian" | "singapore" | "mixed";
  description: string;
}

// Stage 1-50 설정
const STAGE_CONFIGS: Record<number, StageConfig> = {
  // ━━━━━━━━━━━━━━━━━━━━━━━━
  // 1-10: 매우 쉬움 (입문)
  // ━━━━━━━━━━━━━━━━━━━━━━━━
  1: {
    stage: 1,
    speed: 0.8,
    length: "word",
    vocabulary: "basic",
    domain: "general",
    enunciation: "very-clear",
    accent: "american",
    description: "Welcome! Single words, very slow, crystal clear",
  },
  2: {
    stage: 2,
    speed: 0.8,
    length: "word",
    vocabulary: "basic",
    domain: "general",
    enunciation: "very-clear",
    accent: "american",
    description: "Single words, very slow",
  },
  3: {
    stage: 3,
    speed: 0.8,
    length: "phrase",
    vocabulary: "basic",
    domain: "general",
    enunciation: "very-clear",
    accent: "american",
    description: "Short phrases (2-3 words), very slow",
  },
  4: {
    stage: 4,
    speed: 0.8,
    length: "phrase",
    vocabulary: "basic",
    domain: "general",
    enunciation: "very-clear",
    accent: "american",
    description: "Short phrases, very slow",
  },
  5: {
    stage: 5,
    speed: 0.85,
    length: "sentence",
    vocabulary: "basic",
    domain: "general",
    enunciation: "clear",
    accent: "american",
    description: "Simple sentences (I love English), very slow",
  },
  6: {
    stage: 6,
    speed: 0.85,
    length: "sentence",
    vocabulary: "common",
    domain: "general",
    enunciation: "clear",
    accent: "american",
    description: "Simple sentences, common words",
  },
  7: {
    stage: 7,
    speed: 0.9,
    length: "sentence",
    vocabulary: "common",
    domain: "general",
    enunciation: "clear",
    accent: "american",
    description: "Simple sentences, slightly faster",
  },
  8: {
    stage: 8,
    speed: 0.9,
    length: "sentence",
    vocabulary: "common",
    domain: "general",
    enunciation: "natural",
    accent: "american",
    description: "Simple sentences, more natural speech",
  },
  9: {
    stage: 9,
    speed: 0.95,
    length: "compound",
    vocabulary: "common",
    domain: "general",
    enunciation: "natural",
    accent: "american",
    description: "Compound sentences (and, but, or)",
  },
  10: {
    stage: 10,
    speed: 0.95,
    length: "compound",
    vocabulary: "common",
    domain: "general",
    enunciation: "natural",
    accent: "american",
    description: "Compound sentences, more natural",
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━
  // 11-20: 쉬움
  // ━━━━━━━━━━━━━━━━━━━━━━━━
  11: {
    stage: 11,
    speed: 1.0,
    length: "compound",
    vocabulary: "common",
    domain: "general",
    enunciation: "natural",
    accent: "american",
    description: "Normal speed (1.0x), compound sentences",
  },
  12: {
    stage: 12,
    speed: 1.0,
    length: "complex",
    vocabulary: "common",
    domain: "general",
    enunciation: "natural",
    accent: "american",
    description: "Complex sentences (when, because, if)",
  },
  13: {
    stage: 13,
    speed: 1.0,
    length: "complex",
    vocabulary: "phrasal-verbs",
    domain: "general",
    enunciation: "natural",
    accent: "american",
    description: "Phrasal verbs introduced (run out, pick up, look after)",
  },
  14: {
    stage: 14,
    speed: 1.05,
    length: "complex",
    vocabulary: "phrasal-verbs",
    domain: "general",
    enunciation: "natural",
    accent: "american",
    description: "Slightly faster, phrasal verbs",
  },
  15: {
    stage: 15,
    speed: 1.05,
    length: "complex",
    vocabulary: "phrasal-verbs",
    domain: "professional",
    enunciation: "natural",
    accent: "american",
    description: "Professional domain introduced",
  },
  16: {
    stage: 16,
    speed: 1.1,
    length: "complex",
    vocabulary: "idioms",
    domain: "professional",
    enunciation: "reduced",
    accent: "american",
    description: "Idioms introduced (piece of cake, hit the books)",
  },
  17: {
    stage: 17,
    speed: 1.1,
    length: "complex",
    vocabulary: "idioms",
    domain: "professional",
    enunciation: "reduced",
    accent: "mixed",
    description: "Multiple accents mixed in (American + British)",
  },
  18: {
    stage: 18,
    speed: 1.1,
    length: "complex",
    vocabulary: "idioms",
    domain: "professional",
    enunciation: "reduced",
    accent: "mixed",
    description: "Reduced forms, faster speech",
  },
  19: {
    stage: 19,
    speed: 1.15,
    length: "multi-sentence",
    vocabulary: "idioms",
    domain: "professional",
    enunciation: "reduced",
    accent: "mixed",
    description: "Multiple sentences (2-3), natural rhythm",
  },
  20: {
    stage: 20,
    speed: 1.15,
    length: "multi-sentence",
    vocabulary: "idioms",
    domain: "professional",
    enunciation: "reduced",
    accent: "mixed",
    description: "Mid-level checkpoint - idioms + multiple sentences",
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━
  // 21-30: 중간
  // ━━━━━━━━━━━━━━━━━━━━━━━━
  21: {
    stage: 21,
    speed: 1.15,
    length: "multi-sentence",
    vocabulary: "advanced",
    domain: "professional",
    enunciation: "reduced",
    accent: "mixed",
    description: "Advanced vocabulary introduced",
  },
  22: {
    stage: 22,
    speed: 1.2,
    length: "multi-sentence",
    vocabulary: "advanced",
    domain: "professional",
    enunciation: "reduced",
    accent: "mixed",
    description: "Faster (1.2x), advanced vocab",
  },
  23: {
    stage: 23,
    speed: 1.2,
    length: "multi-sentence",
    vocabulary: "advanced",
    domain: "academic",
    enunciation: "unclear",
    accent: "mixed",
    description: "Academic domain introduced, less clear enunciation",
  },
  24: {
    stage: 24,
    speed: 1.2,
    length: "multi-sentence",
    vocabulary: "advanced",
    domain: "academic",
    enunciation: "unclear",
    accent: "australian",
    description: "Australian accent introduced",
  },
  25: {
    stage: 25,
    speed: 1.2,
    length: "multi-sentence",
    vocabulary: "advanced",
    domain: "academic",
    enunciation: "unclear",
    accent: "mixed",
    description: "Checkpoint - academic level, multiple accents",
  },
  26: {
    stage: 26,
    speed: 1.25,
    length: "multi-sentence",
    vocabulary: "academic",
    domain: "academic",
    enunciation: "unclear",
    accent: "mixed",
    description: "Academic vocabulary level, 1.25x speed",
  },
  27: {
    stage: 27,
    speed: 1.25,
    length: "multi-sentence",
    vocabulary: "academic",
    domain: "academic",
    enunciation: "unclear",
    accent: "indian",
    description: "Indian accent introduced",
  },
  28: {
    stage: 28,
    speed: 1.25,
    length: "multi-sentence",
    vocabulary: "academic",
    domain: "academic",
    enunciation: "very-unclear",
    accent: "mixed",
    description: "Very unclear enunciation, natural speech patterns",
  },
  29: {
    stage: 29,
    speed: 1.3,
    length: "multi-sentence",
    vocabulary: "academic",
    domain: "specialized",
    enunciation: "very-unclear",
    accent: "mixed",
    description: "Specialized terminology introduced, 1.3x speed",
  },
  30: {
    stage: 30,
    speed: 1.3,
    length: "multi-sentence",
    vocabulary: "academic",
    domain: "specialized",
    enunciation: "very-unclear",
    accent: "mixed",
    description: "Mid-level complete - challenging academic content",
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━
  // 31-40: 어려움
  // ━━━━━━━━━━━━━━━━━━━━━━━━
  31: {
    stage: 31,
    speed: 1.3,
    length: "multi-sentence",
    vocabulary: "academic",
    domain: "specialized",
    enunciation: "very-unclear",
    accent: "singapore",
    description: "Singapore accent introduced",
  },
  32: {
    stage: 32,
    speed: 1.35,
    length: "multi-sentence",
    vocabulary: "academic",
    domain: "specialized",
    enunciation: "very-unclear",
    accent: "mixed",
    description: "1.35x speed, all accents mixed",
  },
  33: {
    stage: 33,
    speed: 1.35,
    length: "multi-sentence",
    vocabulary: "academic",
    domain: "specialized",
    enunciation: "very-unclear",
    accent: "mixed",
    description: "Heavy accent, rapid speech",
  },
  34: {
    stage: 34,
    speed: 1.35,
    length: "multi-sentence",
    vocabulary: "academic",
    domain: "specialized",
    enunciation: "very-unclear",
    accent: "mixed",
    description: "Native speaker speed and clarity",
  },
  35: {
    stage: 35,
    speed: 1.4,
    length: "multi-sentence",
    vocabulary: "academic",
    domain: "specialized",
    enunciation: "very-unclear",
    accent: "mixed",
    description: "1.4x speed, very challenging",
  },
  36: {
    stage: 36,
    speed: 1.4,
    length: "multi-sentence",
    vocabulary: "academic",
    domain: "specialized",
    enunciation: "very-unclear",
    accent: "mixed",
    description: "Fast and natural, multiple specialized topics",
  },
  37: {
    stage: 37,
    speed: 1.4,
    length: "multi-sentence",
    vocabulary: "academic",
    domain: "specialized",
    enunciation: "very-unclear",
    accent: "mixed",
    description: "Rapid conversation pace",
  },
  38: {
    stage: 38,
    speed: 1.45,
    length: "multi-sentence",
    vocabulary: "academic",
    domain: "specialized",
    enunciation: "very-unclear",
    accent: "mixed",
    description: "1.45x speed, lecture pace",
  },
  39: {
    stage: 39,
    speed: 1.45,
    length: "multi-sentence",
    vocabulary: "academic",
    domain: "specialized",
    enunciation: "very-unclear",
    accent: "mixed",
    description: "University lecture difficulty",
  },
  40: {
    stage: 40,
    speed: 1.45,
    length: "multi-sentence",
    vocabulary: "academic",
    domain: "specialized",
    enunciation: "very-unclear",
    accent: "mixed",
    description: "High difficulty checkpoint",
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━
  // 41-50: 매우 어려움 (고수)
  // ━━━━━━━━━━━━━━━━━━━━━━━━
  41: {
    stage: 41,
    speed: 1.5,
    length: "multi-sentence",
    vocabulary: "academic",
    domain: "specialized",
    enunciation: "very-unclear",
    accent: "mixed",
    description: "1.5x speed - near-native speaker pace",
  },
  42: {
    stage: 42,
    speed: 1.5,
    length: "multi-sentence",
    vocabulary: "academic",
    domain: "specialized",
    enunciation: "very-unclear",
    accent: "mixed",
    description: "Native speaker speed, multiple topics",
  },
  43: {
    stage: 43,
    speed: 1.5,
    length: "multi-sentence",
    vocabulary: "academic",
    domain: "specialized",
    enunciation: "very-unclear",
    accent: "mixed",
    description: "Professional discourse",
  },
  44: {
    stage: 44,
    speed: 1.5,
    length: "multi-sentence",
    vocabulary: "academic",
    domain: "specialized",
    enunciation: "very-unclear",
    accent: "mixed",
    description: "Complex academic arguments",
  },
  45: {
    stage: 45,
    speed: 1.5,
    length: "multi-sentence",
    vocabulary: "academic",
    domain: "specialized",
    enunciation: "very-unclear",
    accent: "mixed",
    description: "Podcast/TED talk level",
  },
  46: {
    stage: 46,
    speed: 1.5,
    length: "multi-sentence",
    vocabulary: "academic",
    domain: "specialized",
    enunciation: "very-unclear",
    accent: "mixed",
    description: "Expert discussion level",
  },
  47: {
    stage: 47,
    speed: 1.5,
    length: "multi-sentence",
    vocabulary: "academic",
    domain: "specialized",
    enunciation: "very-unclear",
    accent: "mixed",
    description: "Advanced academic lecture",
  },
  48: {
    stage: 48,
    speed: 1.5,
    length: "multi-sentence",
    vocabulary: "academic",
    domain: "specialized",
    enunciation: "very-unclear",
    accent: "mixed",
    description: "Research presentation level",
  },
  49: {
    stage: 49,
    speed: 1.5,
    length: "multi-sentence",
    vocabulary: "academic",
    domain: "specialized",
    enunciation: "very-unclear",
    accent: "mixed",
    description: "Mastery checkpoint - nearly impossible",
  },
  50: {
    stage: 50,
    speed: 1.5,
    length: "multi-sentence",
    vocabulary: "academic",
    domain: "specialized",
    enunciation: "very-unclear",
    accent: "mixed",
    description: "🏆 MASTER LEVEL - Native speaker mastery",
  },
};

// Helper 함수
export function getStageConfig(stage: number): StageConfig {
  if (stage < 1 || stage > 50) {
    throw new Error(`Invalid stage: ${stage}. Must be between 1 and 50.`);
  }
  return STAGE_CONFIGS[stage];
}

export function getScoreForStage(stage: number): number {
  // Stage가 높을수록 높은 점수
  return stage * 10; // Stage 1 = 10점, Stage 50 = 500점
}

export function getAllStageConfigs(): StageConfig[] {
  return Object.values(STAGE_CONFIGS).sort((a, b) => a.stage - b.stage);
}
