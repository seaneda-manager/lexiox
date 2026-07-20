export type PassageSourceType =
  | "textbook"
  | "naesin_external"
  | "mock_exam"
  | "workbook"
  | "teacher_made"
  | "junior_reader"
  | "other";

export type PassageTrack =
  | "naesin"
  | "junior"
  | "toefl"
  | "shared";

export type PassageVariantType =
  | "naesin_basic_workout"
  | "naesin_test_pack"
  | "junior_reading_pack"
  | "listening_companion"
  | "review_pack"
  | "final_review_pack"
  | "mock_test_pack";

export type PassageStatus = "draft" | "published" | "archived";

export type SchoolLevel = "elementary" | "middle" | "high";

export type ExamType =
  | "midterm"
  | "final"
  | "monthly_exam"
  | "practice"
  | "mock_exam"
  | "other";

export type PassageQuestionStyle =
  | "grammar"
  | "sentence_order"
  | "sentence_insertion"
  | "sentence_odd_one_out"
  | "blank_inference"
  | "main_topic"
  | "main_idea"
  | "reference_inference"
  | "incorrect_word"
  | "summary"
  | "detail"
  | "listening_detail"
  | "listening_main_idea"
  | "listening_sequence";

export type PassageMeta = {
  schoolLevel?: SchoolLevel;
  examType?: ExamType;
  gradeLabel?: string;
  sourceLabel?: string;
  sourceType: PassageSourceType;
  originalQuestionStyle?: PassageQuestionStyle;
  note?: string;
};

export type PassageParagraph = {
  id: string;
  label?: string;
  sentenceIds: string[];
  rawText: string;
};

export type PassageSentence = {
  id: string;
  paragraphId: string;
  order: number;
  text: string;
  note?: string;
};

export type PassageCore = {
  id: string;
  title: string;
  track: PassageTrack;
  status: PassageStatus;
  meta: PassageMeta;
  rawPassage: string;
  paragraphs: PassageParagraph[];
  sentences: PassageSentence[];
  tags?: string[];
};

export type WorkoutStageKey =
  | "word_analysis"
  | "structure_analysis"
  | "translation"
  | "composition"
  | "sentence_function"
  | "sentence_order"
  | "grammar_judgment"
  | "read_aloud";

export type SentenceFunctionType =
  | "scene_setting"
  | "topic_sentence"
  | "supporting_detail"
  | "example"
  | "transition"
  | "contrast"
  | "conclusion";

export type SentenceFunctionAuthoring = {
  sentenceId: string;
  correct: SentenceFunctionType;
  accepted?: SentenceFunctionType[];
  clue?: string;
  explanation?: string;
};

export type TranslationChunkAuthoring = {
  id: string;
  sourceSpan: string;
  hintKo?: string;
  acceptableAnswers: string[];
};

export type TranslationAuthoring = {
  sentenceId: string;
  referenceKo: string;
  acceptableKeywords?: string[];
  notes?: string[];
  chunks: TranslationChunkAuthoring[];
};

export type CompositionChunkAuthoring = {
  id: string;
  ko: string;
  en: string;
};

export type CompositionAuthoring = {
  sentenceId: string;
  chunks: CompositionChunkAuthoring[];
  targetSkeleton?: string;
  referenceSentence: string;
};

export type StructureModifierAuthoring = {
  span: string;
  type?: string;
  subtype?: string;
  targetType?: string;
  target?: string;
};

export type StructureAuthoring = {
  sentenceId: string;
  subjectAccepted: string[];
  verbAccepted: string[];
  objectAccepted?: string[];
  complementAccepted?: string[];
  modifiers?: StructureModifierAuthoring[];
};

export type WordAnalysisAuthoring = {
  sentenceId: string;
  recommendedUnknownWords?: string[];
};

export type SentenceOrderKind =
  | "naesin_excerpt_restore"
  | "mock_fixed_lead_reorder";

export type SentenceOrderUnit = {
  id: string;
  type: "sentence" | "sentence_bundle" | "part";
  label?: string;
  text: string;
  sourceSentenceIds?: string[];
};

export type SentenceOrderAuthoringItem = {
  id: string;
  kind: SentenceOrderKind;
  title?: string;
  instructions?: string;
  exposeFullOriginal: false;
  fixedLead?: SentenceOrderUnit;
  reorderUnits: SentenceOrderUnit[];
  correctOrder: string[];
  explanation?: {
    summary?: string;
    koreanHint?: string;
  };
};

export type GrammarJudgmentLabelAxis = {
  key: string;
  label: string;
  options: string[];
  correctOptionIds: string[];
};

export type PassageGrammarTarget = {
  id: string;
  sentenceId: string;
  questionStyle: PassageQuestionStyle;
  blankVersion: string;
  choices: Array<{
    id: string;
    text: string;
  }>;
  correctChoiceId: string;
  labelAxes: GrammarJudgmentLabelAxis[];
  factorOptions: Array<{
    id: string;
    text: string;
    isCore?: boolean;
  }>;
  correctFactorIds: string[];
  wrongReasonOptions?: Array<{
    id: string;
    text: string;
  }>;
  correctWrongReasonIds?: string[];
  explanation?: {
    summary?: string;
    koreanHint?: string;
  };
};

export type ReadAloudHintChunk = {
  id: string;
  text: string;
  hintKo?: string;
};

export type ReadAloudAuthoringItem = {
  sentenceId: string;
  skeleton: string;
  keywordHints: string[];
  chunks: ReadAloudHintChunk[];
  finalText: string;
};

export type WorkoutLayer = {
  enabledStages: WorkoutStageKey[];
  wordAnalysis?: WordAnalysisAuthoring[];
  structureAnalysis?: StructureAuthoring[];
  translation?: TranslationAuthoring[];
  composition?: CompositionAuthoring[];
  sentenceFunctions?: SentenceFunctionAuthoring[];
  sentenceOrderItems?: SentenceOrderAuthoringItem[];
  grammarTargets?: PassageGrammarTarget[];
  readAloudItems?: ReadAloudAuthoringItem[];
};

export type AssessmentQuestionBase = {
  id: string;
  style: PassageQuestionStyle;
  title?: string;
  prompt: string;
  explanation?: string;
};

export type AssessmentMultipleChoiceQuestion = AssessmentQuestionBase & {
  choices: Array<{
    id: string;
    text: string;
  }>;
  correctChoiceId: string;
  evidenceSentenceIds?: string[];
};

export type AssessmentSummaryQuestion = AssessmentQuestionBase & {
  summaryStem: string;
  options: Array<{
    id: string;
    text: string;
  }>;
  correctChoiceIds: string[];
};

export type AssessmentQuestion =
  | AssessmentMultipleChoiceQuestion
  | AssessmentSummaryQuestion;

export type ListeningQuestion = {
  id: string;
  style: Extract<
    PassageQuestionStyle,
    "listening_detail" | "listening_main_idea" | "listening_sequence"
  >;
  prompt: string;
  choices: Array<{
    id: string;
    text: string;
  }>;
  correctChoiceId: string;
  explanation?: string;
};

export type ListeningLayer = {
  audioScript?: string;
  ttsEnabled?: boolean;
  questions?: ListeningQuestion[];
};

export type VariantPack = {
  id: string;
  title: string;
  variantType: PassageVariantType;
  track: PassageTrack;
  status: PassageStatus;
  note?: string;
  recommendedQuestionStyles?: PassageQuestionStyle[];
  assessmentQuestions?: AssessmentQuestion[];
  listeningLayer?: ListeningLayer;
};

export type PassageAuthoringDocument = {
  core: PassageCore;
  workout: WorkoutLayer;
  variants: VariantPack[];
};

export const VARIANT_PRESET_MAP: Record<
  PassageVariantType,
  {
    label: string;
    track: PassageTrack;
    recommendedQuestionStyles: PassageQuestionStyle[];
  }
> = {
  naesin_basic_workout: {
    label: "Naesin Basic Workout",
    track: "naesin",
    recommendedQuestionStyles: ["grammar", "sentence_order"],
  },
  naesin_test_pack: {
    label: "Naesin Test Pack",
    track: "naesin",
    recommendedQuestionStyles: [
      "grammar",
      "sentence_order",
      "sentence_odd_one_out",
      "blank_inference",
      "main_topic",
      "main_idea",
      "reference_inference",
      "incorrect_word",
      "summary",
    ],
  },
  junior_reading_pack: {
    label: "Junior Reading Pack",
    track: "junior",
    recommendedQuestionStyles: [
      "blank_inference",
      "main_topic",
      "grammar",
      "summary",
      "reference_inference",
    ],
  },
  listening_companion: {
    label: "Listening Companion",
    track: "shared",
    recommendedQuestionStyles: [
      "listening_detail",
      "listening_main_idea",
      "listening_sequence",
    ],
  },
  review_pack: {
    label: "Review Pack",
    track: "shared",
    recommendedQuestionStyles: ["grammar", "summary", "detail"],
  },
  final_review_pack: {
    label: "Final Review Pack",
    track: "naesin",
    recommendedQuestionStyles: [
      "grammar",
      "main_topic",
      "main_idea",
      "summary",
      "reference_inference",
    ],
  },
  mock_test_pack: {
    label: "Mock Test Pack",
    track: "shared",
    recommendedQuestionStyles: [
      "blank_inference",
      "main_topic",
      "main_idea",
      "summary",
      "detail",
      "grammar",
      "sentence_order",
    ],
  },
};

export function createEmptyPassageAuthoringDocument(
  id: string,
): PassageAuthoringDocument {
  return {
    core: {
      id,
      title: "",
      track: "naesin",
      status: "draft",
      meta: {
        sourceType: "teacher_made",
      },
      rawPassage: "",
      paragraphs: [],
      sentences: [],
      tags: [],
    },
    workout: {
      enabledStages: [
        "word_analysis",
        "structure_analysis",
        "translation",
        "composition",
        "sentence_function",
        "sentence_order",
        "grammar_judgment",
        "read_aloud",
      ],
      wordAnalysis: [],
      structureAnalysis: [],
      translation: [],
      composition: [],
      sentenceFunctions: [],
      sentenceOrderItems: [],
      grammarTargets: [],
      readAloudItems: [],
    },
    variants: [],
  };
}
