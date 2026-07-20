import { avg, avgNullable } from "@/lib/reading-review/core/metrics";
import type { SessionAnalysisSnapshotRow } from "@/lib/reading-review/core/types";

export type StudentTendencySnapshotPayload = {
  basisSessionIds: string[];
  weakTags: string[];
  topPatterns: {
    sessionCount: number;
    avgAccuracyOverall: number;
    avgScorePercent: number;
    avgEvidenceSubmissionRate: number;
    avgEvidenceMatchedRateAmongSubmitted: number;
    avgVocabTestAccuracy: number | null;
    avgUnknownWordCount: number;
    avgSentenceLogCoverageRate: number;
    avgSvocCompletionRateAmongLogged: number;
    avgReviewCompletionRate: number;
    weakTagCounts: Record<string, number>;
  };
  prescriptionTags: string[];
};

export function buildStudentTendencySnapshot(
  rows: SessionAnalysisSnapshotRow[],
  windowSize: number,
): StudentTendencySnapshotPayload | null {
  const limitedRows = rows.slice(0, windowSize);
  if (limitedRows.length === 0) return null;

  const weakCounts = new Map<string, number>();

  for (const row of limitedRows) {
    for (const tag of row.weak_tags ?? []) {
      weakCounts.set(tag, (weakCounts.get(tag) ?? 0) + 1);
    }
  }

  const sortedWeakTags = [...weakCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag);

  const topPatterns = {
    sessionCount: limitedRows.length,
    avgAccuracyOverall: avg(limitedRows.map((row) => Number(row.accuracy_overall ?? 0))),
    avgScorePercent: avg(limitedRows.map((row) => Number(row.score_percent ?? 0))),
    avgEvidenceSubmissionRate: avg(
      limitedRows.map((row) => Number((row.evidence_metrics?.submissionRate as number) ?? 0)),
    ),
    avgEvidenceMatchedRateAmongSubmitted: avg(
      limitedRows.map(
        (row) => Number((row.evidence_metrics?.matchedRateAmongSubmitted as number) ?? 0),
      ),
    ),
    avgVocabTestAccuracy: avgNullable(
      limitedRows.map((row) =>
        row.vocab_metrics?.vocabTestAccuracy == null
          ? null
          : Number(row.vocab_metrics.vocabTestAccuracy),
      ),
    ),
    avgUnknownWordCount: avg(
      limitedRows.map((row) => Number((row.vocab_metrics?.unknownWordCount as number) ?? 0)),
    ),
    avgSentenceLogCoverageRate: avg(
      limitedRows.map((row) => Number((row.sentence_metrics?.sentenceLogCoverageRate as number) ?? 0)),
    ),
    avgSvocCompletionRateAmongLogged: avg(
      limitedRows.map(
        (row) => Number((row.sentence_metrics?.svocCompletionRateAmongLogged as number) ?? 0),
      ),
    ),
    avgReviewCompletionRate: avg(
      limitedRows.map((row) => Number((row.behavior_metrics?.reviewCompletionRate as number) ?? 0)),
    ),
    weakTagCounts: Object.fromEntries(weakCounts),
  };

  const prescriptionTags = sortedWeakTags.slice(0, 5);

  return {
    basisSessionIds: limitedRows.map((row) => row.session_id),
    weakTags: prescriptionTags,
    topPatterns,
    prescriptionTags,
  };
}
