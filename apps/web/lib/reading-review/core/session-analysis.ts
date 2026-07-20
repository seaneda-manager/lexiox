import {
  buildAccuracyBucket,
  buildPassageBucket,
  getRepeatedWords,
  pct,
  round2,
} from "@/lib/reading-review/core/metrics";
import { hasText } from "@/lib/reading-review/core/text";
import { inferWeakTags } from "@/lib/reading-review/core/weak-tags";
import type {
  AnswerRow,
  BehaviorMetrics,
  EvidenceLogRow,
  EvidenceMetrics,
  QuestionRow,
  SentenceAnalysisLogRow,
  SentenceMetrics,
  SessionAnalysisResult,
  UnknownWordLogRow,
  VocabLogRow,
  VocabMetrics,
  WeakTagTaxonomy,
} from "@/lib/reading-review/core/types";

type BuildSessionAnalysisResultInput = {
  questions: QuestionRow[];
  answers: AnswerRow[];
  evidenceLogs: EvidenceLogRow[];
  unknownWordLogs: UnknownWordLogRow[];
  sentenceLogs: SentenceAnalysisLogRow[];
  vocabLogs: VocabLogRow[];
  taxonomy: WeakTagTaxonomy;
  prescriptionMap: Record<string, string>;
};

export function buildSessionAnalysisResult(
  input: BuildSessionAnalysisResultInput,
): SessionAnalysisResult {
  const {
    questions,
    answers,
    evidenceLogs,
    unknownWordLogs,
    sentenceLogs,
    vocabLogs,
    taxonomy,
    prescriptionMap,
  } = input;

  const answerByQuestion = new Map<string, AnswerRow>();
  for (const row of answers) {
    answerByQuestion.set(row.question_id, row);
  }

  const byQuestionType = buildAccuracyBucket(
    questions,
    (question) => question.type,
    answerByQuestion,
  );

  const byPassage = buildPassageBucket(questions, answerByQuestion, unknownWordLogs);

  const totalQuestions = questions.length;
  const totalPassages = new Set(questions.map((question) => question.passage_id)).size;

  const correctCount = questions.filter(
    (question) => answerByQuestion.get(question.id)?.is_correct === true,
  ).length;

  const accuracyOverall = pct(correctCount, totalQuestions);

  const evidenceSubmittedCount = evidenceLogs.filter(
    (row) => (row.selected_evidence?.length ?? 0) > 0,
  ).length;
  const evidenceMatchedCount = evidenceLogs.filter((row) => row.matched === true).length;
  const evidenceMismatchCount = evidenceLogs.filter(
    (row) => (row.selected_evidence?.length ?? 0) > 0 && row.matched !== true,
  ).length;
  const evidenceOverSelectCount = evidenceLogs.filter(
    (row) => (row.selected_evidence?.length ?? 0) > 1,
  ).length;

  const evidenceMetrics: EvidenceMetrics = {
    submittedCount: evidenceSubmittedCount,
    submissionRate: pct(evidenceSubmittedCount, totalQuestions),
    matchedCount: evidenceMatchedCount,
    matchedRateOverall: pct(evidenceMatchedCount, totalQuestions),
    matchedRateAmongSubmitted: pct(evidenceMatchedCount, evidenceSubmittedCount),
    mismatchCount: evidenceMismatchCount,
    overSelectCount: evidenceOverSelectCount,
  };

  const unknownWordsFlat = unknownWordLogs.flatMap((row) => row.words ?? []);
  const repeatedUnknownWords = getRepeatedWords(unknownWordsFlat);
  const vocabAttemptCount = vocabLogs.length;
  const vocabCorrectCount = vocabLogs.filter((row) => row.is_correct === true).length;

  const vocabMetrics: VocabMetrics = {
    unknownWordCount: unknownWordsFlat.length,
    unknownWordPassageCount: unknownWordLogs.filter((row) => (row.words?.length ?? 0) > 0)
      .length,
    unknownWordPassageCoverageRate: pct(
      unknownWordLogs.filter((row) => row.words != null).length,
      totalPassages,
    ),
    vocabAttemptCount,
    vocabTestAccuracy: vocabAttemptCount > 0 ? pct(vocabCorrectCount, vocabAttemptCount) : null,
    repeatedUnknownWords,
  };

  const translationSubmittedCount = sentenceLogs.filter((row) => hasText(row.translation_ko))
    .length;
  const svocCompletedCount = sentenceLogs.filter(
    (row) =>
      hasText(row.subject_text) &&
      hasText(row.verb_text) &&
      (hasText(row.object_text) || hasText(row.complement_text)),
  ).length;
  const modifierCompletedCount = sentenceLogs.filter((row) => hasText(row.modifier_text)).length;

  const sentenceMetrics: SentenceMetrics = {
    sentenceLogCount: sentenceLogs.length,
    sentenceLogCoverageRate: pct(sentenceLogs.length, totalQuestions),
    translationSubmittedCount,
    translationSubmissionRate: pct(translationSubmittedCount, totalQuestions),
    svocCompletedCount,
    svocCompletionRateOverall: pct(svocCompletedCount, totalQuestions),
    svocCompletionRateAmongLogged: pct(svocCompletedCount, sentenceLogs.length),
    modifierCompletedCount,
    modifierCompletionRateOverall: pct(modifierCompletedCount, totalQuestions),
    modifierCompletionRateAmongLogged: pct(modifierCompletedCount, sentenceLogs.length),
  };

  const elapsedValues = answers
    .map((row) => Number(row.elapsed_sec ?? 0))
    .filter((value) => Number.isFinite(value) && value > 0);

  const reviewExpectedUnits = totalQuestions + totalPassages + totalQuestions;
  const reviewCompletedUnits =
    evidenceLogs.length + unknownWordLogs.length + sentenceLogs.length;

  const behaviorMetrics: BehaviorMetrics = {
    avgElapsedSec:
      elapsedValues.length > 0
        ? round2(elapsedValues.reduce((sum, value) => sum + value, 0) / elapsedValues.length)
        : 0,
    omittedCount: answers.filter((row) => row.omitted === true).length,
    flaggedCount: answers.filter((row) => row.flagged === true).length,
    reviewCompletionRate: pct(reviewCompletedUnits, reviewExpectedUnits),
  };

  const weakTags = inferWeakTags({
    accuracyOverall,
    byQuestionType,
    evidenceMetrics,
    vocabMetrics,
    sentenceMetrics,
    behaviorMetrics,
    taxonomy,
  });

  const prescriptions = weakTags.map((tag) => prescriptionMap[tag] ?? tag);

  return {
    accuracyOverall,
    byQuestionType,
    byPassage,
    evidenceMetrics,
    vocabMetrics,
    sentenceMetrics,
    behaviorMetrics,
    weakTags,
    prescriptions,
  };
}
