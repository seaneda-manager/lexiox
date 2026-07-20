// apps/web/models/vocab/speed.types.ts

export type SpeedQuestionType = "MEANING_TO_WORD" | "WORD_TO_MEANING";

export type SpeedQuestion = {
  /** Unique question id (UI key) */
  id: string;

  type: SpeedQuestionType;

  /** Word identifier in your vocab set */
  wordId: string;

  /** What the learner sees (ex: Korean meaning) */
  prompt: string;

  /** Correct answer string (ex: target word text) */
  answer: string;

  /** Optional: choices for MCQ variants (not required for v1 runner) */
  choices?: string[];

  /** Optional: extra info for debugging/analytics */
  meta?: Record<string, any>;
};

export type SpeedAttemptItem = {
  questionId: string;
  wordId: string;

  prompt: string;
  answer: string;

  /** User input */
  input: string;

  /** Result */
  isCorrect: boolean;

  /** Optional timing */
  timeMs?: number;

  /** When recorded */
  createdAt?: string;
};

export type SpeedAttemptResult = {
  userId: string;

  /** 1 = first run, 2 = retry run */
  tryIndex: number;

  totalQuestions: number;
  correctCount: number;

  /** Word IDs that were wrong */
  wrongWordIds: string[];

  /** Alias for downstream compatibility */
  retryWordIds?: string[];

  /** Convenience */
  accuracy?: number;
  passed?: boolean;

  /** Optional per-item details */
  items?: SpeedAttemptItem[];

  finishedAt?: string;

  /** Room for future metrics */
  meta?: Record<string, any>;
};
