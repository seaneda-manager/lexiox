// Game Mode Types
export type GameMode =
  | "WORD_TO_MEANING"    // 단어 → 뜻
  | "MEANING_TO_WORD"    // 뜻 → 단어
  | "MATCHING_WORDS"     // 어울리는 단어
  | "PARTS_OF_SPEECH"    // 품사
  | "SENTENCE_CONTEXT";  // 문장

// Combo Chain State
export type ComboQuestion = {
  mode: GameMode;
  wordId: string;
  question: string;
  options: string[];
  correctAnswer: string;
  difficulty: number; // 1-5
};

export type ComboChain = {
  wordId: string;
  questionsAsked: GameMode[];
  currentQuestionIndex: number;
  isComplete: boolean;
  score: number;
  bonusMultiplier: number;
};

// Game Session State
export type DodgeMatchSession = {
  level: number;
  score: number;
  lives: number;
  maxLives: number;
  comboChains: ComboChain[];
  currentChain: ComboChain | null;
  wordQueue: string[];
  completedWords: Set<string>;
  badges: string[];
};

// Falling Word Object
export type FallingWord = {
  id: string;
  text: string;
  x: number;
  y: number;
  velocityY: number;
  type: "CORRECT" | "INCORRECT" | "NEUTRAL";
};
