// apps/web/lib/reading/naesin-analytics.ts

import {
  type NReadingAnalytics,
  type NReadingQuestion,
  type NReadingQuestionType,
  type NReadingPrescriptionTag,
  type NReadingSkillGroup,
  type WrongReasonTag,
  N_READING_PRESCRIPTION_TAGS,
  N_READING_QUESTION_TYPES,
  N_READING_SKILL_GROUPS,
  makeEmptyNReadingAnalytics,
  getNReadingSkillGroup,
} from "@/models/reading";
import type { NReadingGradedAnswerRecord } from "./naesin-grading";

export interface BuildNReadingAnalyticsParams {
  sessionId: string;
  questions: NReadingQuestion[];
  gradedAnswers: NReadingGradedAnswerRecord[];
}

export function buildNReadingAnalytics(
  params: BuildNReadingAnalyticsParams,
): NReadingAnalytics {
  const { sessionId, questions, gradedAnswers } = params;

  const analytics = makeEmptyNReadingAnalytics(sessionId);
  const questionMap = new Map(questions.map((q) => [q.id, q]));

  analytics.accuracyOverall = toAccuracy(
    gradedAnswers.filter((a) => a.isCorrect).length,
    gradedAnswers.length,
  );

  analytics.byQuestionType = buildAccuracyByQuestionType(gradedAnswers);
  analytics.bySkillGroup = buildAccuracyBySkillGroup(gradedAnswers);
  analytics.byPassage = buildAccuracyByPassage(gradedAnswers);
  analytics.wrongReasonBreakdown = buildWrongReasonBreakdown(gradedAnswers);
  analytics.avgElapsedSecByType = buildAverageElapsedSecByType(gradedAnswers);

  analytics.prescriptionTags = inferNReadingPrescriptionTags({
    questions,
    gradedAnswers,
    byQuestionType: analytics.byQuestionType,
    bySkillGroup: analytics.bySkillGroup,
  });

  // questionMap is kept here intentionally so future passage/meta-based analytics
  // can expand without changing this file's main signature.
  void questionMap;

  return analytics;
}

export function buildAccuracyByQuestionType(
  gradedAnswers: NReadingGradedAnswerRecord[],
): Record<NReadingQuestionType, number> {
  const counts = Object.fromEntries(
    N_READING_QUESTION_TYPES.map((type) => [
      type,
      { total: 0, correct: 0 },
    ]),
  ) as Record<NReadingQuestionType, { total: number; correct: number }>;

  for (const answer of gradedAnswers) {
    counts[answer.questionType].total += 1;
    if (answer.isCorrect) counts[answer.questionType].correct += 1;
  }

  return Object.fromEntries(
    N_READING_QUESTION_TYPES.map((type) => [
      type,
      toAccuracy(counts[type].correct, counts[type].total),
    ]),
  ) as Record<NReadingQuestionType, number>;
}

export function buildAccuracyBySkillGroup(
  gradedAnswers: NReadingGradedAnswerRecord[],
): Record<NReadingSkillGroup, number> {
  const counts = Object.fromEntries(
    N_READING_SKILL_GROUPS.map((group) => [
      group,
      { total: 0, correct: 0 },
    ]),
  ) as Record<NReadingSkillGroup, { total: number; correct: number }>;

  for (const answer of gradedAnswers) {
    counts[answer.skillGroup].total += 1;
    if (answer.isCorrect) counts[answer.skillGroup].correct += 1;
  }

  return Object.fromEntries(
    N_READING_SKILL_GROUPS.map((group) => [
      group,
      toAccuracy(counts[group].correct, counts[group].total),
    ]),
  ) as Record<NReadingSkillGroup, number>;
}

export function buildAccuracyByPassage(
  gradedAnswers: NReadingGradedAnswerRecord[],
): Record<string, number> {
  const counts: Record<string, { total: number; correct: number }> = {};

  for (const answer of gradedAnswers) {
    if (!counts[answer.passageId]) {
      counts[answer.passageId] = { total: 0, correct: 0 };
    }
    counts[answer.passageId].total += 1;
    if (answer.isCorrect) counts[answer.passageId].correct += 1;
  }

  return Object.fromEntries(
    Object.entries(counts).map(([passageId, value]) => [
      passageId,
      toAccuracy(value.correct, value.total),
    ]),
  );
}

export function buildWrongReasonBreakdown(
  gradedAnswers: NReadingGradedAnswerRecord[],
): Partial<Record<WrongReasonTag, number>> {
  const counts: Partial<Record<WrongReasonTag, number>> = {};

  for (const answer of gradedAnswers) {
    if (answer.isCorrect) continue;
    if (!answer.wrongReasonTags?.length) continue;

    for (const tag of answer.wrongReasonTags) {
      counts[tag] = (counts[tag] ?? 0) + 1;
    }
  }

  return counts;
}

export function buildAverageElapsedSecByType(
  gradedAnswers: NReadingGradedAnswerRecord[],
): Partial<Record<NReadingQuestionType, number>> {
  const counts: Partial<
    Record<NReadingQuestionType, { totalElapsed: number; count: number }>
  > = {};

  for (const answer of gradedAnswers) {
    if (typeof answer.elapsedSec !== "number") continue;

    const bucket = counts[answer.questionType] ?? {
      totalElapsed: 0,
      count: 0,
    };

    bucket.totalElapsed += answer.elapsedSec;
    bucket.count += 1;

    counts[answer.questionType] = bucket;
  }

  return Object.fromEntries(
    Object.entries(counts).map(([type, value]) => [
      type,
      round1(value.totalElapsed / value.count),
    ]),
  ) as Partial<Record<NReadingQuestionType, number>>;
}

export function inferNReadingPrescriptionTags(params: {
  questions: NReadingQuestion[];
  gradedAnswers: NReadingGradedAnswerRecord[];
  byQuestionType: Record<NReadingQuestionType, number>;
  bySkillGroup: Record<NReadingSkillGroup, number>;
}): NReadingPrescriptionTag[] {
  const { gradedAnswers, byQuestionType, bySkillGroup } = params;

  const tags = new Set<NReadingPrescriptionTag>();

  const vocabWeak =
    minAccuracy([
      byQuestionType.vocab_in_context,
      byQuestionType.phrase_meaning,
    ]) > 0 &&
    minAccuracy([
      byQuestionType.vocab_in_context,
      byQuestionType.phrase_meaning,
    ]) < 70;

  if (vocabWeak) {
    tags.add("vocab_context_weak");
  }

  const blankLogicMin = minAccuracy([
    byQuestionType.blank,
    byQuestionType.sentence_insertion,
    byQuestionType.order,
    byQuestionType.topic_sentence,
  ]);

  if (blankLogicMin > 0 && blankLogicMin < 70) {
    tags.add("blank_logic_weak");
  }

  const sentenceOrderMin = minAccuracy([
    byQuestionType.sentence_insertion,
    byQuestionType.order,
  ]);

  if (sentenceOrderMin > 0 && sentenceOrderMin < 60) {
    tags.add("sentence_order_weak");
  }

  const detailLocalMin = minAccuracy([
    byQuestionType.detail,
    byQuestionType.not_true,
    byQuestionType.reference,
    byQuestionType.author_claim,
  ]);

  if (detailLocalMin > 0 && detailLocalMin < 70) {
    tags.add("detail_accuracy_low");
  }

  if (
    byQuestionType.grammar_in_context > 0 &&
    byQuestionType.grammar_in_context < 70
  ) {
    tags.add("grammar_context_weak");
  }

  const overallAvgElapsed = average(
    gradedAnswers
      .map((a) => a.elapsedSec)
      .filter((value): value is number => typeof value === "number"),
  );

  const discourseWeakAndSlow =
    bySkillGroup.discourse_logic > 0 &&
    bySkillGroup.discourse_logic < 70 &&
    overallAvgElapsed >= 75;

  const globallySlow = overallAvgElapsed >= 90;

  if (discourseWeakAndSlow || globallySlow) {
    tags.add("slow_reader");
  }

  return N_READING_PRESCRIPTION_TAGS.filter((tag) => tags.has(tag));
}

export function buildQuestionTypeAccuracyMapFromRaw(params: {
  questions: NReadingQuestion[];
  correctQuestionIds: string[];
}): Record<NReadingQuestionType, number> {
  const counts = Object.fromEntries(
    N_READING_QUESTION_TYPES.map((type) => [
      type,
      { total: 0, correct: 0 },
    ]),
  ) as Record<NReadingQuestionType, { total: number; correct: number }>;

  const correctSet = new Set(params.correctQuestionIds);

  for (const question of params.questions) {
    counts[question.type].total += 1;
    if (correctSet.has(question.id)) {
      counts[question.type].correct += 1;
    }
  }

  return Object.fromEntries(
    N_READING_QUESTION_TYPES.map((type) => [
      type,
      toAccuracy(counts[type].correct, counts[type].total),
    ]),
  ) as Record<NReadingQuestionType, number>;
}

export function buildSkillGroupAccuracyMapFromQuestions(params: {
  questions: NReadingQuestion[];
  correctQuestionIds: string[];
}): Record<NReadingSkillGroup, number> {
  const counts = Object.fromEntries(
    N_READING_SKILL_GROUPS.map((group) => [
      group,
      { total: 0, correct: 0 },
    ]),
  ) as Record<NReadingSkillGroup, { total: number; correct: number }>;

  const correctSet = new Set(params.correctQuestionIds);

  for (const question of params.questions) {
    const group = getNReadingSkillGroup(question.type);
    counts[group].total += 1;

    if (correctSet.has(question.id)) {
      counts[group].correct += 1;
    }
  }

  return Object.fromEntries(
    N_READING_SKILL_GROUPS.map((group) => [
      group,
      toAccuracy(counts[group].correct, counts[group].total),
    ]),
  ) as Record<NReadingSkillGroup, number>;
}

function toAccuracy(correct: number, total: number): number {
  if (!total) return 0;
  return round1((correct / total) * 100);
}

function round1(value: number): number {
  return Number(value.toFixed(1));
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return round1(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function minAccuracy(values: number[]): number {
  const filtered = values.filter((v) => v > 0);
  if (!filtered.length) return 0;
  return Math.min(...filtered);
}