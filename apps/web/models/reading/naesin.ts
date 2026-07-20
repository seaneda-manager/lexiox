// apps/web/models/reading/naesin.ts

export type NReadingTrack = "lingo_x_naesin";

export type ReadingSourceType =
  | "school_exam"
  | "mock_exam"
  | "textbook"
  | "academy_original"
  | "worksheet"
  | "ebs_like";

export type GradeBand =
  | "ELEM"
  | "M1"
  | "M2"
  | "M3"
  | "H1"
  | "H2"
  | "H3";

export type ReadingDifficulty =
  | "foundation"
  | "basic"
  | "standard"
  | "advanced"
  | "challenge";

export type ExamContext =
  | "midterm"
  | "final"
  | "monthly_mock"
  | "csat_like"
  | "homework"
  | "clinic";

export type PassageGenre =
  | "narrative"
  | "expository"
  | "argumentative"
  | "dialogue"
  | "notice"
  | "email"
  | "ad"
  | "chart_based"
  | "hybrid";

export type NReadingQuestionType =
  | "main_idea"
  | "title"
  | "purpose"
  | "tone"
  | "detail"
  | "not_true"
  | "inference"
  | "vocab_in_context"
  | "reference"
  | "blank"
  | "sentence_insertion"
  | "order"
  | "summary"
  | "topic_sentence"
  | "grammar_in_context"
  | "phrase_meaning"
  | "author_claim"
  | "matching"
  | "chart_interpretation";

export type NReadingSkillGroup =
  | "macro_comprehension"
  | "local_comprehension"
  | "vocab_phrase"
  | "grammar_structure"
  | "discourse_logic"
  | "information_mapping";

export type NReadingEvidenceType = "sentence" | "span" | "paragraph" | "logic";

export type NReadingSessionStatus =
  | "assigned"
  | "started"
  | "submitted"
  | "reviewed";

export type NReadingSessionMode =
  | "practice"
  | "test"
  | "review"
  | "clinic";

export type WrongReasonTag =
  | "misread_sentence"
  | "missed_keyword"
  | "vocab_unknown"
  | "grammar_confusion"
  | "logic_confusion"
  | "careless"
  | "time_pressure"
  | "guessed";

export type NReadingPrescriptionTag =
  | "vocab_context_weak"
  | "blank_logic_weak"
  | "sentence_order_weak"
  | "detail_accuracy_low"
  | "slow_reader"
  | "grammar_context_weak";

export interface NReadingChoice {
  id: string;
  label: string; // 1,2,3,4 or A,B,C,D
  text: string;
  isCorrect?: boolean;
}

export type NReadingAnswerKey =
  | { kind: "single_choice"; choiceId: string }
  | { kind: "multi_choice"; choiceIds: string[] }
  | { kind: "short_text"; value: string }
  | { kind: "ordered"; values: string[] }
  | { kind: "mapping"; pairs: Record<string, string> };

export interface NReadingEvidence {
  id: string;
  questionId: string;
  type: NReadingEvidenceType;
  quote?: string;
  startOffset?: number;
  endOffset?: number;
  paragraphLabel?: string;
  note?: string;
}

export interface NReadingPassage {
  id: string;
  setId: string;
  orderIndex: number;
  title?: string;
  sourceType: ReadingSourceType;
  examContext: ExamContext;
  gradeBand: GradeBand;
  difficulty: ReadingDifficulty;
  genre: PassageGenre;
  text: string;
  translationKo?: string;
  summary?: string;
  vocabFocus?: string[];
  grammarFocus?: string[];
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface NReadingQuestion {
  id: string;
  passageId: string;
  setId: string;
  orderIndex: number;
  numberLabel: string;
  type: NReadingQuestionType;
  stem: string;
  promptKo?: string;
  choices?: NReadingChoice[];
  answer: NReadingAnswerKey;
  evidence?: NReadingEvidence[];
  explanation?: string;
  skillTags?: string[];
  vocabTags?: string[];
  grammarTags?: string[];
  logicTags?: string[];
  difficulty?: ReadingDifficulty;
  score?: number;
  metadata?: Record<string, unknown>;
}

export interface NReadingSet {
  id: string;
  track: NReadingTrack;
  curriculumId?: string;
  title: string;
  subtitle?: string;
  sourceType: ReadingSourceType;
  examContext: ExamContext;
  gradeBand: GradeBand;
  difficulty: ReadingDifficulty;
  schoolName?: string;
  semester?: string;
  bookName?: string;
  unitRange?: string;
  totalQuestions: number;
  estimatedMinutes?: number;
  tags?: string[];
  isPublished: boolean;
  metadata?: Record<string, unknown>;
}

export interface NReadingSession {
  id: string;
  studentId: string;
  setId: string;
  status: NReadingSessionStatus;
  mode: NReadingSessionMode;
  startedAt?: string;
  submittedAt?: string;
  totalElapsedSec?: number;
  scoreRaw?: number;
  scorePercent?: number;
  bandLabel?: string;
  analyticsSnapshot?: Record<string, unknown>;
}

export interface NReadingAnswerRecord {
  id: string;
  sessionId: string;
  questionId: string;
  selectedChoiceId?: string;
  selectedChoiceIds?: string[];
  answerText?: string;
  orderedValues?: string[];
  mappingPairs?: Record<string, string>;
  isCorrect: boolean;
  elapsedSec?: number;
  confidence?: 1 | 2 | 3 | 4 | 5;
  evidenceChecked?: boolean;
  flagged?: boolean;
  wrongReasonTags?: WrongReasonTag[];
}

export interface NReadingAnalytics {
  sessionId: string;
  accuracyOverall: number;
  byQuestionType: Record<NReadingQuestionType, number>;
  bySkillGroup: Record<NReadingSkillGroup, number>;
  byPassage: Record<string, number>;
  wrongReasonBreakdown: Partial<Record<WrongReasonTag, number>>;
  avgElapsedSecByType?: Partial<Record<NReadingQuestionType, number>>;
  prescriptionTags?: NReadingPrescriptionTag[];
}

export interface NReadingQuestionWithDerived extends NReadingQuestion {
  skillGroup: NReadingSkillGroup;
}

export interface NReadingSetBundle {
  set: NReadingSet;
  passages: NReadingPassage[];
  questions: NReadingQuestion[];
}

export const N_READING_QUESTION_TYPES = [
  "main_idea",
  "title",
  "purpose",
  "tone",
  "detail",
  "not_true",
  "inference",
  "vocab_in_context",
  "reference",
  "blank",
  "sentence_insertion",
  "order",
  "summary",
  "topic_sentence",
  "grammar_in_context",
  "phrase_meaning",
  "author_claim",
  "matching",
  "chart_interpretation",
] as const satisfies readonly NReadingQuestionType[];

export const N_READING_SKILL_GROUPS = [
  "macro_comprehension",
  "local_comprehension",
  "vocab_phrase",
  "grammar_structure",
  "discourse_logic",
  "information_mapping",
] as const satisfies readonly NReadingSkillGroup[];

export const N_READING_SOURCE_TYPES = [
  "school_exam",
  "mock_exam",
  "textbook",
  "academy_original",
  "worksheet",
  "ebs_like",
] as const satisfies readonly ReadingSourceType[];

export const N_READING_GRADE_BANDS = [
  "ELEM",
  "M1",
  "M2",
  "M3",
  "H1",
  "H2",
  "H3",
] as const satisfies readonly GradeBand[];

export const N_READING_DIFFICULTIES = [
  "foundation",
  "basic",
  "standard",
  "advanced",
  "challenge",
] as const satisfies readonly ReadingDifficulty[];

export const N_READING_EXAM_CONTEXTS = [
  "midterm",
  "final",
  "monthly_mock",
  "csat_like",
  "homework",
  "clinic",
] as const satisfies readonly ExamContext[];

export const N_READING_PASSAGE_GENRES = [
  "narrative",
  "expository",
  "argumentative",
  "dialogue",
  "notice",
  "email",
  "ad",
  "chart_based",
  "hybrid",
] as const satisfies readonly PassageGenre[];

export const N_READING_WRONG_REASON_TAGS = [
  "misread_sentence",
  "missed_keyword",
  "vocab_unknown",
  "grammar_confusion",
  "logic_confusion",
  "careless",
  "time_pressure",
  "guessed",
] as const satisfies readonly WrongReasonTag[];

export const N_READING_PRESCRIPTION_TAGS = [
  "vocab_context_weak",
  "blank_logic_weak",
  "sentence_order_weak",
  "detail_accuracy_low",
  "slow_reader",
  "grammar_context_weak",
] as const satisfies readonly NReadingPrescriptionTag[];

export const N_READING_TYPE_TO_SKILL_GROUP: Record<
  NReadingQuestionType,
  NReadingSkillGroup
> = {
  main_idea: "macro_comprehension",
  title: "macro_comprehension",
  purpose: "macro_comprehension",
  tone: "macro_comprehension",
  detail: "local_comprehension",
  not_true: "local_comprehension",
  inference: "local_comprehension",
  vocab_in_context: "vocab_phrase",
  reference: "local_comprehension",
  blank: "discourse_logic",
  sentence_insertion: "discourse_logic",
  order: "discourse_logic",
  summary: "macro_comprehension",
  topic_sentence: "discourse_logic",
  grammar_in_context: "grammar_structure",
  phrase_meaning: "vocab_phrase",
  author_claim: "local_comprehension",
  matching: "information_mapping",
  chart_interpretation: "information_mapping",
};

export function getNReadingSkillGroup(
  type: NReadingQuestionType,
): NReadingSkillGroup {
  return N_READING_TYPE_TO_SKILL_GROUP[type];
}

export function isNReadingQuestionType(value: unknown): value is NReadingQuestionType {
  return (
    typeof value === "string" &&
    (N_READING_QUESTION_TYPES as readonly string[]).includes(value)
  );
}

export function isNReadingSkillGroup(value: unknown): value is NReadingSkillGroup {
  return (
    typeof value === "string" &&
    (N_READING_SKILL_GROUPS as readonly string[]).includes(value)
  );
}

export function isReadingSourceType(value: unknown): value is ReadingSourceType {
  return (
    typeof value === "string" &&
    (N_READING_SOURCE_TYPES as readonly string[]).includes(value)
  );
}

export function isGradeBand(value: unknown): value is GradeBand {
  return (
    typeof value === "string" &&
    (N_READING_GRADE_BANDS as readonly string[]).includes(value)
  );
}

export function isReadingDifficulty(value: unknown): value is ReadingDifficulty {
  return (
    typeof value === "string" &&
    (N_READING_DIFFICULTIES as readonly string[]).includes(value)
  );
}

export function isExamContext(value: unknown): value is ExamContext {
  return (
    typeof value === "string" &&
    (N_READING_EXAM_CONTEXTS as readonly string[]).includes(value)
  );
}

export function isPassageGenre(value: unknown): value is PassageGenre {
  return (
    typeof value === "string" &&
    (N_READING_PASSAGE_GENRES as readonly string[]).includes(value)
  );
}

export function isWrongReasonTag(value: unknown): value is WrongReasonTag {
  return (
    typeof value === "string" &&
    (N_READING_WRONG_REASON_TAGS as readonly string[]).includes(value)
  );
}

export function isNReadingPrescriptionTag(
  value: unknown,
): value is NReadingPrescriptionTag {
  return (
    typeof value === "string" &&
    (N_READING_PRESCRIPTION_TAGS as readonly string[]).includes(value)
  );
}

export function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function normalizeTextArray(values: string[]): string[] {
  return values.map(normalizeText);
}

export function isCorrectNReadingAnswer(
  answerKey: NReadingAnswerKey,
  answer: Pick<
    NReadingAnswerRecord,
    "selectedChoiceId" | "selectedChoiceIds" | "answerText" | "orderedValues" | "mappingPairs"
  >,
): boolean {
  switch (answerKey.kind) {
    case "single_choice":
      return answer.selectedChoiceId === answerKey.choiceId;

    case "multi_choice": {
      const actual = [...(answer.selectedChoiceIds ?? [])].sort();
      const expected = [...answerKey.choiceIds].sort();
      return (
        actual.length === expected.length &&
        actual.every((value, index) => value === expected[index])
      );
    }

    case "short_text":
      return normalizeText(answer.answerText ?? "") === normalizeText(answerKey.value);

    case "ordered": {
      const actual = normalizeTextArray(answer.orderedValues ?? []);
      const expected = normalizeTextArray(answerKey.values);
      return (
        actual.length === expected.length &&
        actual.every((value, index) => value === expected[index])
      );
    }

    case "mapping": {
      const actual = answer.mappingPairs ?? {};
      const expected = answerKey.pairs;
      const actualKeys = Object.keys(actual).sort();
      const expectedKeys = Object.keys(expected).sort();

      if (
        actualKeys.length !== expectedKeys.length ||
        !actualKeys.every((key, index) => key === expectedKeys[index])
      ) {
        return false;
      }

      return expectedKeys.every(
        (key) => normalizeText(actual[key] ?? "") === normalizeText(expected[key] ?? ""),
      );
    }

    default: {
      const _never: never = answerKey;
      return _never;
    }
  }
}

export function makeEmptyNReadingAnalytics(
  sessionId: string,
): NReadingAnalytics {
  const byQuestionType = Object.fromEntries(
    N_READING_QUESTION_TYPES.map((type) => [type, 0]),
  ) as Record<NReadingQuestionType, number>;

  const bySkillGroup = Object.fromEntries(
    N_READING_SKILL_GROUPS.map((group) => [group, 0]),
  ) as Record<NReadingSkillGroup, number>;

  return {
    sessionId,
    accuracyOverall: 0,
    byQuestionType,
    bySkillGroup,
    byPassage: {},
    wrongReasonBreakdown: {},
    avgElapsedSecByType: {},
    prescriptionTags: [],
  };
}

export function deriveNReadingQuestion(
  question: NReadingQuestion,
): NReadingQuestionWithDerived {
  return {
    ...question,
    skillGroup: getNReadingSkillGroup(question.type),
  };
}

export function getQuestionsByPassage(
  bundle: NReadingSetBundle,
  passageId: string,
): NReadingQuestion[] {
  return bundle.questions
    .filter((question) => question.passageId === passageId)
    .sort((a, b) => a.orderIndex - b.orderIndex);
}

export function getPassageById(
  bundle: NReadingSetBundle,
  passageId: string,
): NReadingPassage | undefined {
  return bundle.passages.find((passage) => passage.id === passageId);
}

export function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${String(x)}`);
}