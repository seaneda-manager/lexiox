// apps/web/lib/typing/types.ts
// Framework-agnostic types for the typing-practice engine (LXGym "타자 암기 스피드 훈련").

export type TypingUnit = {
  id: string;
  /** English text the student types. */
  text: string;
  /** Korean translation/meaning, used by 'blind' reveal mode. */
  translationKo?: string | null;
};

/**
 * How much of the English text is shown while typing:
 * - full: entire text visible (echo-typing)
 * - partial: some words blanked out (blankRatio controls how many)
 * - blind: no English shown at all, only translationKo (typing purely from memory)
 */
export type RevealMode = 'full' | 'partial' | 'blind';

export type CharState = 'pending' | 'correct' | 'incorrect' | 'current';

export type TypingSessionConfig = {
  units: TypingUnit[];
  revealMode: RevealMode;
  /** Fraction of words blanked in 'partial' mode, 0-1. Ignored otherwise. */
  blankRatio: number;
  /** Present units (sentences) in shuffled order; student must restore original order. */
  shuffled: boolean;
  /** Block advancing past an incorrect character until it's corrected. */
  strict: boolean;
};

export type TypingMetrics = {
  /** Net WPM: correct chars / 5 / minutes elapsed. */
  wpm: number;
  /** Raw WPM: all typed chars (incl. errors) / 5 / minutes elapsed. */
  rawWpm: number;
  /** Correct keystrokes / total keystrokes, 0-100. */
  accuracy: number;
  errorCount: number;
  elapsedMs: number;
  /** Words the student hesitated on (typing latency well above session median). */
  weakWords: string[];
};

export type UnitResult = {
  unitId: string;
  text: string;
  metrics: TypingMetrics;
};
