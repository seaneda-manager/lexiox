// apps/web/models/vocab/session/prescreen.ts

export type PrescreenChoice = "KNOWN" | "UNKNOWN" | "SKIP";

/**
 * PrescreenResult
 * - knownWordIds: words the learner marked as "I know"
 * - unknownWordIds: words the learner marked as "I don't know" (or skipped treated as unknown depending on UI)
 *
 * Keep it minimal + stable as SSOT for session flow.
 */
export type PrescreenResult = {
  knownWordIds: string[];
  unknownWordIds: string[];

  /** Optional: per-word raw decisions for analytics/debug */
  decisions?: Record<string, PrescreenChoice>;

  /** Optional meta */
  meta?: Record<string, any>;
};

/** Small helper (optional) */
export function makeEmptyPrescreenResult(): PrescreenResult {
  return { knownWordIds: [], unknownWordIds: [] };
}
