// apps/web/lib/reading/naesin-grading.ts

import {
  type NReadingAnswerKey,
  type NReadingAnswerRecord,
  type NReadingQuestion,
  type NReadingQuestionType,
  type NReadingSession,
  type NReadingSkillGroup,
  type WrongReasonTag,
  getNReadingSkillGroup,
  isCorrectNReadingAnswer,
} from "@/models/reading";

export interface NReadingSubmittedAnswerInput {
  questionId: string;
  selectedChoiceId?: string;
  selectedChoiceIds?: string[];
  answerText?: string;
  orderedValues?: string[];
  mappingPairs?: Record<string, string>;
  elapsedSec?: number;
  confidence?: 1 | 2 | 3 | 4 | 5;
  evidenceChecked?: boolean;
  flagged?: boolean;
  wrongReasonTags?: WrongReasonTag[];
}

export interface NReadingGradedAnswerRecord extends NReadingAnswerRecord {
  passageId: string;
  setId: string;
  questionType: NReadingQuestionType;
  skillGroup: NReadingSkillGroup;
  questionOrderIndex: number;
  numberLabel: string;
  awardedScore: number;
  maxScore: number;
  omitted: boolean;
}

export interface NReadingGradingSummary {
  totalQuestions: number;
  answeredQuestions: number;
  omittedQuestions: number;
  correctQuestions: number;
  incorrectQuestions: number;
  totalPossibleScore: number;
  awardedScore: number;
  scorePercent: number;
  questionIdsCorrect: string[];
  questionIdsIncorrect: string[];
  questionIdsOmitted: string[];
}

export interface NReadingGradeSetResult {
  gradedAnswers: NReadingGradedAnswerRecord[];
  summary: NReadingGradingSummary;
}

export interface NReadingSessionScorePatch
  extends Pick<
    NReadingSession,
    "scoreRaw" | "scorePercent" | "submittedAt" | "status"
  > {}

export function gradeNReadingQuestion(params: {
  sessionId: string;
  question: NReadingQuestion;
  submitted?: NReadingSubmittedAnswerInput;
}): NReadingGradedAnswerRecord {
  const { sessionId, question, submitted } = params;

  const omitted = !hasMeaningfulAnswer(submitted);
  const isCorrect =
    !omitted &&
    isCorrectNReadingAnswer(question.answer, {
      selectedChoiceId: submitted?.selectedChoiceId,
      selectedChoiceIds: submitted?.selectedChoiceIds,
      answerText: submitted?.answerText,
      orderedValues: submitted?.orderedValues,
      mappingPairs: submitted?.mappingPairs,
    });

  const maxScore = question.score ?? 1;
  const awardedScore = isCorrect ? maxScore : 0;

  return {
    id: createLocalId("nra"),
    sessionId,
    questionId: question.id,
    selectedChoiceId: submitted?.selectedChoiceId,
    selectedChoiceIds: submitted?.selectedChoiceIds,
    answerText: submitted?.answerText,
    orderedValues: submitted?.orderedValues,
    mappingPairs: submitted?.mappingPairs,
    isCorrect,
    elapsedSec: submitted?.elapsedSec,
    confidence: submitted?.confidence,
    evidenceChecked: submitted?.evidenceChecked,
    flagged: submitted?.flagged,
    wrongReasonTags: normalizeWrongReasonTags(submitted?.wrongReasonTags),
    passageId: question.passageId,
    setId: question.setId,
    questionType: question.type,
    skillGroup: getNReadingSkillGroup(question.type),
    questionOrderIndex: question.orderIndex,
    numberLabel: question.numberLabel,
    awardedScore,
    maxScore,
    omitted,
  };
}

export function gradeNReadingSet(params: {
  sessionId: string;
  questions: NReadingQuestion[];
  submittedAnswers: NReadingSubmittedAnswerInput[];
}): NReadingGradeSetResult {
  const { sessionId, questions, submittedAnswers } = params;

  const answerMap = new Map<string, NReadingSubmittedAnswerInput>();
  for (const answer of submittedAnswers) {
    if (!answer?.questionId) continue;
    answerMap.set(answer.questionId, answer);
  }

  const orderedQuestions = [...questions].sort(
    (a, b) => a.orderIndex - b.orderIndex,
  );

  const gradedAnswers = orderedQuestions.map((question) =>
    gradeNReadingQuestion({
      sessionId,
      question,
      submitted: answerMap.get(question.id),
    }),
  );

  const summary = summarizeNReadingGradedAnswers(gradedAnswers);

  return {
    gradedAnswers,
    summary,
  };
}

export function summarizeNReadingGradedAnswers(
  gradedAnswers: NReadingGradedAnswerRecord[],
): NReadingGradingSummary {
  const totalQuestions = gradedAnswers.length;
  const answeredQuestions = gradedAnswers.filter((a) => !a.omitted).length;
  const omittedQuestions = gradedAnswers.filter((a) => a.omitted).length;
  const correctQuestions = gradedAnswers.filter((a) => a.isCorrect).length;
  const incorrectQuestions = totalQuestions - correctQuestions;
  const totalPossibleScore = gradedAnswers.reduce(
    (sum, answer) => sum + answer.maxScore,
    0,
  );
  const awardedScore = gradedAnswers.reduce(
    (sum, answer) => sum + answer.awardedScore,
    0,
  );

  return {
    totalQuestions,
    answeredQuestions,
    omittedQuestions,
    correctQuestions,
    incorrectQuestions,
    totalPossibleScore,
    awardedScore,
    scorePercent: toPercent(awardedScore, totalPossibleScore),
    questionIdsCorrect: gradedAnswers
      .filter((a) => a.isCorrect)
      .map((a) => a.questionId),
    questionIdsIncorrect: gradedAnswers
      .filter((a) => !a.isCorrect)
      .map((a) => a.questionId),
    questionIdsOmitted: gradedAnswers
      .filter((a) => a.omitted)
      .map((a) => a.questionId),
  };
}

export function toNReadingSessionScorePatch(
  result: NReadingGradeSetResult,
  submittedAt: string = new Date().toISOString(),
): NReadingSessionScorePatch {
  return {
    scoreRaw: result.summary.awardedScore,
    scorePercent: result.summary.scorePercent,
    submittedAt,
    status: "submitted",
  };
}

export function hasMeaningfulAnswer(
  answer?: Partial<NReadingSubmittedAnswerInput>,
): boolean {
  if (!answer) return false;

  if (answer.selectedChoiceId) return true;
  if (answer.selectedChoiceIds && answer.selectedChoiceIds.length > 0) return true;
  if (answer.orderedValues && answer.orderedValues.length > 0) return true;

  if (answer.mappingPairs && Object.keys(answer.mappingPairs).length > 0) {
    return true;
  }

  if (typeof answer.answerText === "string" && answer.answerText.trim().length > 0) {
    return true;
  }

  return false;
}

export function matchesSingleChoiceAnswer(
  answerKey: Extract<NReadingAnswerKey, { kind: "single_choice" }>,
  selectedChoiceId?: string,
): boolean {
  return answerKey.choiceId === selectedChoiceId;
}

export function buildEmptySubmittedAnswer(
  questionId: string,
): NReadingSubmittedAnswerInput {
  return {
    questionId,
  };
}

function normalizeWrongReasonTags(
  tags?: WrongReasonTag[],
): WrongReasonTag[] | undefined {
  if (!tags || tags.length === 0) return undefined;
  return [...new Set(tags)];
}

function createLocalId(prefix: string): string {
  const uuid =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  return `${prefix}_${uuid}`;
}

function toPercent(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return round1((numerator / denominator) * 100);
}

function round1(value: number): number {
  return Number(value.toFixed(1));
}