// apps/web/lib/reading/naesin-payload.ts

import {
  type ExamContext,
  type GradeBand,
  type NReadingAnswerKey,
  type NReadingChoice,
  type NReadingEvidence,
  type NReadingQuestionType,
  type PassageGenre,
  type ReadingDifficulty,
  type ReadingSourceType,
  isExamContext,
  isGradeBand,
  isNReadingQuestionType,
  isPassageGenre,
  isReadingDifficulty,
  isReadingSourceType,
} from "@/models/reading";

export interface NaesinReadingSetInput {
  title: string;
  subtitle?: string;
  curriculumId?: string;
  sourceType: ReadingSourceType;
  examContext: ExamContext;
  gradeBand: GradeBand;
  difficulty: ReadingDifficulty;
  schoolName?: string;
  semester?: string;
  bookName?: string;
  unitRange?: string;
  estimatedMinutes?: number;
  tags?: string[];
  isPublished?: boolean;
  metadata?: Record<string, unknown>;
}

export interface NaesinReadingPassageInput {
  orderIndex: number;
  title?: string;
  sourceType?: ReadingSourceType;
  examContext?: ExamContext;
  gradeBand?: GradeBand;
  difficulty?: ReadingDifficulty;
  genre: PassageGenre;
  text: string;
  translationKo?: string;
  summary?: string;
  vocabFocus?: string[];
  grammarFocus?: string[];
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface NaesinReadingQuestionInput {
  orderIndex: number;
  numberLabel: string;
  type: NReadingQuestionType;
  stem: string;
  promptKo?: string;
  choices?: NReadingChoice[];
  answer: NReadingAnswerKey;
  evidence?: NaesinReadingEvidenceInput[];
  explanation?: string;
  skillTags?: string[];
  vocabTags?: string[];
  grammarTags?: string[];
  logicTags?: string[];
  difficulty?: ReadingDifficulty;
  score?: number;
  metadata?: Record<string, unknown>;
}

export interface NaesinReadingEvidenceInput
  extends Omit<NReadingEvidence, "id" | "questionId"> {
  orderIndex?: number;
}

export interface NaesinReadingPassageBundleInput {
  passage: NaesinReadingPassageInput;
  questions: NaesinReadingQuestionInput[];
}

export interface NaesinReadingCreatePayload {
  set: NaesinReadingSetInput;
  passages: NaesinReadingPassageBundleInput[];
}

export interface NaesinReadingNormalizedPayload {
  set: Required<
    Pick<
      NaesinReadingSetInput,
      | "title"
      | "sourceType"
      | "examContext"
      | "gradeBand"
      | "difficulty"
      | "estimatedMinutes"
      | "tags"
      | "isPublished"
      | "metadata"
    >
  > &
  Omit<
    NaesinReadingSetInput,
    | "title"
    | "sourceType"
    | "examContext"
    | "gradeBand"
    | "difficulty"
    | "estimatedMinutes"
    | "tags"
    | "isPublished"
    | "metadata"
  >;
  passages: Array<{
    passage: Required<
      Pick<
        NaesinReadingPassageInput,
        | "orderIndex"
        | "sourceType"
        | "examContext"
        | "gradeBand"
        | "difficulty"
        | "genre"
        | "text"
      >
    > &
    Omit<
      NaesinReadingPassageInput,
      | "orderIndex"
      | "sourceType"
      | "examContext"
      | "gradeBand"
      | "difficulty"
      | "genre"
      | "text"
    >;
    questions: Array<
      Required<
        Pick<
          NaesinReadingQuestionInput,
          "orderIndex" | "numberLabel" | "type" | "stem" | "answer" | "score"
        >
      > &
      Omit<
        NaesinReadingQuestionInput,
        "orderIndex" | "numberLabel" | "type" | "stem" | "answer" | "score"
      > & {
        evidence: NaesinReadingEvidenceInput[];
      }
    >;
  }>;
}

export function normalizeNaesinReadingPayload(
  payload: NaesinReadingCreatePayload,
): NaesinReadingNormalizedPayload {
  assertValidNaesinReadingPayload(payload);

  const set = payload.set;

  return {
    set: {
      title: cleanText(set.title),
      subtitle: cleanOptionalText(set.subtitle),
      curriculumId: cleanOptionalText(set.curriculumId),
      sourceType: set.sourceType,
      examContext: set.examContext,
      gradeBand: set.gradeBand,
      difficulty: set.difficulty,
      schoolName: cleanOptionalText(set.schoolName),
      semester: cleanOptionalText(set.semester),
      bookName: cleanOptionalText(set.bookName),
      unitRange: cleanOptionalText(set.unitRange),
      estimatedMinutes: Math.max(0, Number(set.estimatedMinutes ?? 0)),
      tags: uniqCleanArray(set.tags),
      isPublished: Boolean(set.isPublished),
      metadata: set.metadata ?? {},
    },
    passages: payload.passages
      .map((bundle, bundleIndex) => ({
        passage: {
          orderIndex: Number(bundle.passage.orderIndex ?? bundleIndex),
          title: cleanOptionalText(bundle.passage.title),
          sourceType: bundle.passage.sourceType ?? set.sourceType,
          examContext: bundle.passage.examContext ?? set.examContext,
          gradeBand: bundle.passage.gradeBand ?? set.gradeBand,
          difficulty: bundle.passage.difficulty ?? set.difficulty,
          genre: bundle.passage.genre,
          text: cleanMultilineText(bundle.passage.text),
          translationKo: cleanOptionalMultilineText(bundle.passage.translationKo),
          summary: cleanOptionalMultilineText(bundle.passage.summary),
          vocabFocus: uniqCleanArray(bundle.passage.vocabFocus),
          grammarFocus: uniqCleanArray(bundle.passage.grammarFocus),
          tags: uniqCleanArray(bundle.passage.tags),
          metadata: bundle.passage.metadata ?? {},
        },
        questions: bundle.questions
          .map((question, questionIndex) => ({
            orderIndex: Number(question.orderIndex ?? questionIndex),
            numberLabel: cleanText(question.numberLabel),
            type: question.type,
            stem: cleanMultilineText(question.stem),
            promptKo: cleanOptionalMultilineText(question.promptKo),
            choices: normalizeChoices(question.choices),
            answer: normalizeAnswerKey(question.answer),
            evidence: normalizeEvidence(question.evidence),
            explanation: cleanOptionalMultilineText(question.explanation),
            skillTags: uniqCleanArray(question.skillTags),
            vocabTags: uniqCleanArray(question.vocabTags),
            grammarTags: uniqCleanArray(question.grammarTags),
            logicTags: uniqCleanArray(question.logicTags),
            difficulty: question.difficulty,
            score: Math.max(0.1, Number(question.score ?? 1)),
            metadata: question.metadata ?? {},
          }))
          .sort((a, b) => a.orderIndex - b.orderIndex),
      }))
      .sort((a, b) => a.passage.orderIndex - b.passage.orderIndex),
  };
}

export function assertValidNaesinReadingPayload(
  payload: NaesinReadingCreatePayload,
): void {
  if (!payload?.set) {
    throw new Error("set is required");
  }

  if (!cleanText(payload.set.title)) {
    throw new Error("set.title is required");
  }

  if (!isReadingSourceType(payload.set.sourceType)) {
    throw new Error("set.sourceType is invalid");
  }

  if (!isExamContext(payload.set.examContext)) {
    throw new Error("set.examContext is invalid");
  }

  if (!isGradeBand(payload.set.gradeBand)) {
    throw new Error("set.gradeBand is invalid");
  }

  if (!isReadingDifficulty(payload.set.difficulty)) {
    throw new Error("set.difficulty is invalid");
  }

  if (!Array.isArray(payload.passages) || payload.passages.length === 0) {
    throw new Error("passages must contain at least one passage");
  }

  const numberLabels = new Set<string>();

  for (const [bundleIndex, bundle] of payload.passages.entries()) {
    if (!bundle?.passage) {
      throw new Error(`passages[${bundleIndex}].passage is required`);
    }

    if (!isPassageGenre(bundle.passage.genre)) {
      throw new Error(`passages[${bundleIndex}].passage.genre is invalid`);
    }

    if (!cleanText(bundle.passage.text)) {
      throw new Error(`passages[${bundleIndex}].passage.text is required`);
    }

    if (!Array.isArray(bundle.questions) || bundle.questions.length === 0) {
      throw new Error(`passages[${bundleIndex}].questions must not be empty`);
    }

    const choiceIdsInBundle = new Set<string>();

    for (const [questionIndex, question] of bundle.questions.entries()) {
      if (!cleanText(question.numberLabel)) {
        throw new Error(
          `passages[${bundleIndex}].questions[${questionIndex}].numberLabel is required`,
        );
      }

      if (numberLabels.has(question.numberLabel)) {
        throw new Error(`duplicate question numberLabel: ${question.numberLabel}`);
      }
      numberLabels.add(question.numberLabel);

      if (!isNReadingQuestionType(question.type)) {
        throw new Error(
          `passages[${bundleIndex}].questions[${questionIndex}].type is invalid`,
        );
      }

      if (!cleanText(question.stem)) {
        throw new Error(
          `passages[${bundleIndex}].questions[${questionIndex}].stem is required`,
        );
      }

      validateQuestionAnswer(question, bundleIndex, questionIndex);

      for (const choice of question.choices ?? []) {
        if (choiceIdsInBundle.has(choice.id)) {
          throw new Error(`duplicate choice id in bundle: ${choice.id}`);
        }
        choiceIdsInBundle.add(choice.id);
      }
    }
  }
}

function validateQuestionAnswer(
  question: NaesinReadingQuestionInput,
  bundleIndex: number,
  questionIndex: number,
): void {
  const prefix = `passages[${bundleIndex}].questions[${questionIndex}]`;
  const answer = question.answer;

  if (!answer || typeof answer !== "object" || !("kind" in answer)) {
    throw new Error(`${prefix}.answer is invalid`);
  }

  if (
    (answer.kind === "single_choice" || answer.kind === "multi_choice") &&
    (!Array.isArray(question.choices) || question.choices.length === 0)
  ) {
    throw new Error(`${prefix}.choices are required for choice-based questions`);
  }

  switch (answer.kind) {
    case "single_choice": {
      if (!cleanText(answer.choiceId)) {
        throw new Error(`${prefix}.answer.choiceId is required`);
      }
      const exists = (question.choices ?? []).some((c) => c.id === answer.choiceId);
      if (!exists) {
        throw new Error(`${prefix}.answer.choiceId does not exist in choices`);
      }
      return;
    }

    case "multi_choice": {
      if (!Array.isArray(answer.choiceIds) || answer.choiceIds.length === 0) {
        throw new Error(`${prefix}.answer.choiceIds must not be empty`);
      }
      for (const choiceId of answer.choiceIds) {
        const exists = (question.choices ?? []).some((c) => c.id === choiceId);
        if (!exists) {
          throw new Error(`${prefix}.answer.choiceIds contains invalid choice id`);
        }
      }
      return;
    }

    case "short_text": {
      if (!cleanText(answer.value)) {
        throw new Error(`${prefix}.answer.value is required`);
      }
      return;
    }

    case "ordered": {
      if (!Array.isArray(answer.values) || answer.values.length === 0) {
        throw new Error(`${prefix}.answer.values must not be empty`);
      }
      return;
    }

    case "mapping": {
      if (!answer.pairs || Object.keys(answer.pairs).length === 0) {
        throw new Error(`${prefix}.answer.pairs must not be empty`);
      }
      return;
    }

    default: {
      const _never: never = answer;
      throw new Error(`unsupported answer kind: ${String(_never)}`);
    }
  }
}

function normalizeChoices(
  choices?: NReadingChoice[],
): NReadingChoice[] | undefined {
  if (!choices?.length) return undefined;

  return choices.map((choice, index) => ({
    id: cleanText(choice.id || `choice_${index + 1}`),
    label: cleanText(choice.label || String(index + 1)),
    text: cleanMultilineText(choice.text),
    isCorrect: choice.isCorrect,
  }));
}

function normalizeAnswerKey(answer: NReadingAnswerKey): NReadingAnswerKey {
  switch (answer.kind) {
    case "single_choice":
      return {
        kind: "single_choice",
        choiceId: cleanText(answer.choiceId),
      };

    case "multi_choice":
      return {
        kind: "multi_choice",
        choiceIds: uniqCleanArray(answer.choiceIds),
      };

    case "short_text":
      return {
        kind: "short_text",
        value: cleanText(answer.value),
      };

    case "ordered":
      return {
        kind: "ordered",
        values: answer.values.map(cleanText).filter(Boolean),
      };

    case "mapping":
      return {
        kind: "mapping",
        pairs: Object.fromEntries(
          Object.entries(answer.pairs).map(([key, value]) => [
            cleanText(key),
            cleanText(value),
          ]),
        ),
      };

    default: {
      const _never: never = answer;
      return _never;
    }
  }
}

function normalizeEvidence(
  evidence?: NaesinReadingEvidenceInput[],
): NaesinReadingEvidenceInput[] {
  if (!evidence?.length) return [];

  return evidence.map((item, index) => ({
    orderIndex: Number(item.orderIndex ?? index),
    type: item.type,
    quote: cleanOptionalMultilineText(item.quote),
    startOffset:
      typeof item.startOffset === "number" ? Math.max(0, item.startOffset) : undefined,
    endOffset:
      typeof item.endOffset === "number" ? Math.max(0, item.endOffset) : undefined,
    paragraphLabel: cleanOptionalText(item.paragraphLabel),
    note: cleanOptionalMultilineText(item.note),
  }));
}

function uniqCleanArray(values?: string[]): string[] {
  if (!values?.length) return [];
  return [...new Set(values.map(cleanText).filter(Boolean))];
}

function cleanText(value?: string | null): string {
  return String(value ?? "").trim();
}

function cleanOptionalText(value?: string | null): string | undefined {
  const cleaned = cleanText(value);
  return cleaned || undefined;
}

function cleanMultilineText(value?: string | null): string {
  return String(value ?? "").replace(/\r\n/g, "\n").trim();
}

function cleanOptionalMultilineText(value?: string | null): string | undefined {
  const cleaned = cleanMultilineText(value);
  return cleaned || undefined;
}
