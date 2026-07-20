// apps/web/models/vocab/session/spelling.ts

/**
 * SpellingResult
 * - spellingFailedIds: wordIds that the learner missed in spelling stage
 *
 * Keep minimal + forward-compatible.
 */
export type SpellingResult = {
  spellingFailedIds: string[];

  /** Optional: per-word detail (input, attempts, etc.) */
  detail?: Record<
    string,
    {
      input?: string;
      attempts?: number;
      isCorrect?: boolean;
      timeMs?: number;
    }
  >;

  meta?: Record<string, any>;
};

export function makeEmptySpellingResult(): SpellingResult {
  return { spellingFailedIds: [] };
}
