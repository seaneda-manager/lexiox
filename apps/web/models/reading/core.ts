// apps/web/models/reading/core.ts

export const READING_TRACKS = ["junior", "naesin", "toefl", "suneung"] as const;
export type ReadingTrack = (typeof READING_TRACKS)[number];

export const READING_SOURCE_TYPES = [
  "textbook",
  "school_exam",
  "mock_exam",
  "external_book",
  "teacher_made",
  "practice",
] as const;
export type ReadingSourceType = (typeof READING_SOURCE_TYPES)[number];

export const READING_LEVELS = [
  "starter",
  "basic",
  "intermediate",
  "advanced",
  "high_advanced",
] as const;
export type ReadingLevel = (typeof READING_LEVELS)[number];

export const PASSAGE_DRILL_TYPES = [
  "translation",
  "writing_from_passage",
  "grammar_explanation",
  "connector_check",
  "sentence_order_from_passage",
  "pronoun_reference",
  "tense_alignment",
  "structure_analysis",
] as const;
export type PassageDrillType = (typeof PASSAGE_DRILL_TYPES)[number];

export const READING_ITEM_TYPES = [
  "detail",
  "main_idea",
  "title",
  "inference",
  "blank_inference",
  "vocabulary_in_context",
  "sentence_insertion",
  "summary",
  "paragraph_function",
] as const;
export type ReadingItemType = (typeof READING_ITEM_TYPES)[number];

export const QUESTION_FORMATS = [
  "mcq",
  "short_answer",
  "reorder",
  "highlight",
  "written",
] as const;
export type QuestionFormat = (typeof QUESTION_FORMATS)[number];

export type ReadingChoice = {
  id: string;
  text: string;
  isCorrect?: boolean;
  rationale?: string | null;
};

export type ReadingEvidenceRef = {
  sentenceId?: string | null;
  paragraphIndex?: number | null;
  startOffset?: number | null;
  endOffset?: number | null;
  quote?: string | null;
  note?: string | null;
};

export type ReadingPassageSentence = {
  id: string;
  paragraphIndex: number;
  order: number;
  text: string;
  translationKo?: string | null;
};

export type ReadingPassageParagraph = {
  id: string;
  order: number;
  text: string;
  translationKo?: string | null;
  summaryKo?: string | null;
};

export type ReadingPassage = {
  id: string;
  track: ReadingTrack;
  level: ReadingLevel;
  title: string;
  sourceType: ReadingSourceType;
  sourceLabel?: string | null;

  schoolName?: string | null;
  gradeLabel?: string | null;
  examScopeLabel?: string | null;

  passageText: string;
  topicTags?: string[];
  keywords?: string[];

  paragraphs?: ReadingPassageParagraph[];
  sentences?: ReadingPassageSentence[];

  createdAt?: string;
  updatedAt?: string;
  isPublished?: boolean;
};

export type PassageDrillBase = {
  id: string;
  passageId: string;
  drillType: PassageDrillType;

  title: string;
  instruction: string;

  track?: ReadingTrack | null;
  level?: ReadingLevel | null;

  targetSentenceIds?: string[];
  targetParagraphIds?: string[];

  explanation?: string | null;
  teacherNote?: string | null;

  order?: number;
  isPublished?: boolean;
};

export type TranslationDrill = PassageDrillBase & {
  drillType: "translation";
  answerKo?: string | null;
  acceptableAnswers?: string[];
};

export type WritingFromPassageDrill = PassageDrillBase & {
  drillType: "writing_from_passage";
  promptType?: "ko_to_en" | "reconstruct" | "paraphrase";
  promptText: string;
  answerEn: string;
  acceptableAnswers?: string[];
};

export type GrammarExplanationDrill = PassageDrillBase & {
  drillType: "grammar_explanation";
  grammarPoints: string[];
  explanationBlocks: Array<{
    label: string;
    content: string;
  }>;
};

export type ConnectorCheckDrill = PassageDrillBase & {
  drillType: "connector_check";
  connectors: Array<{
    token: string;
    functionLabel: string;
    note?: string | null;
    sentenceId?: string | null;
  }>;
};

export type SentenceOrderFromPassageDrill = PassageDrillBase & {
  drillType: "sentence_order_from_passage";
  shuffledSentenceIds: string[];
  correctSentenceIds: string[];
};

export type PronounReferenceDrill = PassageDrillBase & {
  drillType: "pronoun_reference";
  references: Array<{
    pronoun: string;
    sentenceId?: string | null;
    refersTo: string;
    explanation?: string | null;
  }>;
};

export type TenseAlignmentDrill = PassageDrillBase & {
  drillType: "tense_alignment";
  tenseItems: Array<{
    sentenceId?: string | null;
    verbChunk: string;
    tenseLabel: string;
    why: string;
  }>;
};

export type StructureAnalysisDrill = PassageDrillBase & {
  drillType: "structure_analysis";
  analyses: Array<{
    sentenceId?: string | null;
    original: string;
    structure: string;
    notes?: string | null;
  }>;
};

export type PassageDrill =
  | TranslationDrill
  | WritingFromPassageDrill
  | GrammarExplanationDrill
  | ConnectorCheckDrill
  | SentenceOrderFromPassageDrill
  | PronounReferenceDrill
  | TenseAlignmentDrill
  | StructureAnalysisDrill;

export type ReadingItemBase = {
  id: string;
  passageId: string;
  itemType: ReadingItemType;
  format: QuestionFormat;

  track?: ReadingTrack | null;
  level?: ReadingLevel | null;

  question: string;
  instruction?: string | null;

  choices?: ReadingChoice[];
  answerText?: string | null;
  answerChoiceId?: string | null;

  evidence?: ReadingEvidenceRef[];
  explanation?: string | null;
  distractorRationale?: string | null;

  difficulty?: number | null;
  order?: number;
  isPublished?: boolean;
};

export type DetailItem = ReadingItemBase & {
  itemType: "detail";
  format: "mcq" | "short_answer";
};

export type MainIdeaItem = ReadingItemBase & {
  itemType: "main_idea";
  format: "mcq" | "short_answer";
};

export type TitleItem = ReadingItemBase & {
  itemType: "title";
  format: "mcq" | "short_answer";
};

export type InferenceItem = ReadingItemBase & {
  itemType: "inference";
  format: "mcq" | "short_answer";
};

export type BlankInferenceItem = ReadingItemBase & {
  itemType: "blank_inference";
  format: "mcq" | "written";
  blankSourceSentenceId?: string | null;
};

export type VocabularyInContextItem = ReadingItemBase & {
  itemType: "vocabulary_in_context";
  format: "mcq" | "short_answer";
  targetWord: string;
};

export type SentenceInsertionItem = ReadingItemBase & {
  itemType: "sentence_insertion";
  format: "mcq" | "highlight";
  insertSentence: string;
};

export type SummaryItem = ReadingItemBase & {
  itemType: "summary";
  format: "mcq" | "highlight";
};

export type ParagraphFunctionItem = ReadingItemBase & {
  itemType: "paragraph_function";
  format: "mcq" | "short_answer";
  targetParagraphIndex?: number | null;
};

export type ReadingItem =
  | DetailItem
  | MainIdeaItem
  | TitleItem
  | InferenceItem
  | BlankInferenceItem
  | VocabularyInContextItem
  | SentenceInsertionItem
  | SummaryItem
  | ParagraphFunctionItem;

export type ReadingPassageBundle = {
  passage: ReadingPassage;
  drills: PassageDrill[];
  items: ReadingItem[];
};

export function isPassageDrillType(value: string): value is PassageDrillType {
  return (PASSAGE_DRILL_TYPES as readonly string[]).includes(value);
}

export function isReadingItemType(value: string): value is ReadingItemType {
  return (READING_ITEM_TYPES as readonly string[]).includes(value);
}

export function isReadingTrack(value: string): value is ReadingTrack {
  return (READING_TRACKS as readonly string[]).includes(value);
}
