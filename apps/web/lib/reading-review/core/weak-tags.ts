import { accuracyOf } from "@/lib/reading-review/core/metrics";
import type {
  AccuracyBucket,
  BehaviorMetrics,
  EvidenceMetrics,
  SentenceMetrics,
  VocabMetrics,
  WeakTagTaxonomy,
} from "@/lib/reading-review/core/types";

type InferWeakTagsInput = {
  accuracyOverall: number;
  byQuestionType: AccuracyBucket;
  evidenceMetrics: EvidenceMetrics;
  vocabMetrics: VocabMetrics;
  sentenceMetrics: SentenceMetrics;
  behaviorMetrics: BehaviorMetrics;
  taxonomy: WeakTagTaxonomy;
};

export function inferWeakTags(input: InferWeakTagsInput): string[] {
  const weakTags: string[] = [];

  const evidenceSubmissionRate = Number(input.evidenceMetrics.submissionRate ?? 0);
  const evidenceMatchedRateAmongSubmitted = Number(
    input.evidenceMetrics.matchedRateAmongSubmitted ?? 0,
  );
  const evidenceOverSelectCount = Number(input.evidenceMetrics.overSelectCount ?? 0);
  const evidenceSubmittedCount = Number(input.evidenceMetrics.submittedCount ?? 0);

  if (evidenceSubmissionRate < 60) {
    weakTags.push("evidence_review_incomplete");
  }
  if (evidenceSubmittedCount >= 3 && evidenceMatchedRateAmongSubmitted < 60) {
    weakTags.push("evidence_finding_weak");
  }
  if (evidenceSubmittedCount >= 3 && evidenceOverSelectCount >= 2) {
    weakTags.push("evidence_precision_weak");
  }

  const unknownWordCount = Number(input.vocabMetrics.unknownWordCount ?? 0);
  const vocabAttemptCount = Number(input.vocabMetrics.vocabAttemptCount ?? 0);
  const vocabTestAccuracy =
    input.vocabMetrics.vocabTestAccuracy == null
      ? null
      : Number(input.vocabMetrics.vocabTestAccuracy);

  if (unknownWordCount >= 8 && vocabAttemptCount < 3) {
    weakTags.push("vocab_review_incomplete");
  } else if (unknownWordCount >= 8 && vocabAttemptCount >= 3 && (vocabTestAccuracy ?? 0) < 65) {
    weakTags.push("vocab_gap_context");
  } else if (unknownWordCount >= 8 && vocabAttemptCount >= 3) {
    weakTags.push("vocab_gap_basic");
  }

  const translationSubmissionRate = Number(input.sentenceMetrics.translationSubmissionRate ?? 0);
  const sentenceLogCoverageRate = Number(input.sentenceMetrics.sentenceLogCoverageRate ?? 0);
  const svocCompletionRateAmongLogged = Number(
    input.sentenceMetrics.svocCompletionRateAmongLogged ?? 0,
  );
  const modifierCompletionRateAmongLogged = Number(
    input.sentenceMetrics.modifierCompletionRateAmongLogged ?? 0,
  );
  const sentenceLogCount = Number(input.sentenceMetrics.sentenceLogCount ?? 0);

  if (sentenceLogCoverageRate < 50 || translationSubmissionRate < 50) {
    weakTags.push("sentence_review_incomplete");
  }
  if (sentenceLogCount >= 3 && svocCompletionRateAmongLogged < 50) {
    weakTags.push("sentence_structure_weak");
  }
  if (sentenceLogCount >= 3 && modifierCompletionRateAmongLogged < 40) {
    weakTags.push("modifier_vs_core_weak");
  }
  if (sentenceLogCount >= 3 && svocCompletionRateAmongLogged < 60) {
    weakTags.push("svoc_marking_weak");
  }

  const detailAccuracy = accuracyOf(input.byQuestionType, input.taxonomy.detail);
  if (detailAccuracy !== null && detailAccuracy < 65) {
    weakTags.push("detail_trap_weak");
  }

  const inferenceAccuracy = accuracyOf(input.byQuestionType, input.taxonomy.inference);
  if (inferenceAccuracy !== null && inferenceAccuracy < 65) {
    weakTags.push("inference_weak");
  }

  const purposeAccuracy = accuracyOf(input.byQuestionType, input.taxonomy.purposeMainIdea);
  if (purposeAccuracy !== null && purposeAccuracy < 65) {
    weakTags.push("purpose_mainidea_weak");
  }

  const summaryAccuracy = accuracyOf(input.byQuestionType, input.taxonomy.summaryOrganization);
  if (summaryAccuracy !== null && summaryAccuracy < 65) {
    weakTags.push("summary_organization_weak");
  }

  const reviewCompletionRate = Number(input.behaviorMetrics.reviewCompletionRate ?? 0);
  if (reviewCompletionRate < 40) {
    weakTags.push("review_engagement_low");
  }

  if (
    input.accuracyOverall < 55 &&
    evidenceSubmittedCount >= 3 &&
    !weakTags.includes("evidence_finding_weak")
  ) {
    weakTags.push("evidence_finding_weak");
  }

  return [...new Set(weakTags)];
}
