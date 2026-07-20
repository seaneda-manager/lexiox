export type DrillStageId =
  | "word_analysis"
  | "structure_analysis"
  | "translation"
  | "composition"
  | "sentence_function"
  | "sentence_order"
  | "grammar_blank"
  | "read_aloud";

export type DrillStageConfig = {
  id: DrillStageId;
  label: string;
  required: boolean;
  order: number;
  description?: string;
};

export const DRILL_STAGE_CONFIG: DrillStageConfig[] = [
  {
    id: "word_analysis",
    label: "단어 분석",
    required: true,
    order: 1,
  },
  {
    id: "structure_analysis",
    label: "구조 분석",
    required: true,
    order: 2,
  },
  {
    id: "translation",
    label: "해석",
    required: true,
    order: 3,
  },
  {
    id: "composition",
    label: "작문",
    required: true,
    order: 4,
  },
  {
    id: "sentence_function",
    label: "문장 기능",
    required: true,
    order: 5,
  },
  {
    id: "sentence_order",
    label: "문장 순서",
    required: true,
    order: 6,
  },
  {
    id: "grammar_blank",
    label: "문법 빈칸",
    required: true,
    order: 7,
  },
  {
    id: "read_aloud",
    label: "소리 내어 읽기",
    required: false,
    order: 8,
  },
];

export const DRILL_STAGE_ORDER = DRILL_STAGE_CONFIG
  .slice()
  .sort((a, b) => a.order - b.order)
  .map((stage) => stage.id) as DrillStageId[];

export type DrillStage = DrillStageId;

export const DRILL_STAGE_LABEL: Record<DrillStageId, string> =
  Object.fromEntries(
    DRILL_STAGE_CONFIG.map((stage) => [stage.id, stage.label]),
  ) as Record<DrillStageId, string>;

export const DRILL_STAGE_MAP: Record<DrillStageId, DrillStageConfig> =
  Object.fromEntries(
    DRILL_STAGE_CONFIG.map((stage) => [stage.id, stage]),
  ) as Record<DrillStageId, DrillStageConfig>;

export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

export type StructureModifierType =
  | "형용사구"
  | "형용사절"
  | "부사구"
  | "부사절"
  | "분사구문";

export type StructureModifierSubtype =
  | "adjective_word"
  | "adverb_word"
  | "prepositional_phrase"
  | "infinitive_phrase"
  | "participial_phrase"
  | "participial_construction"
  | "relative_clause"
  | "adverb_clause"
  | "other";

export type StructureModifierTargetType =
  | "head_noun"
  | "verb_phrase"
  | "adjective"
  | "adverb"
  | "main_clause"
  | "sentence";

export type StructureFieldAnswer = {
  accepted: string[];
  label?: string;
};

export type StructureModifierAnswer = {
  span: string;
  target: string;
  type?: StructureModifierType;
  subtype?: StructureModifierSubtype;
  targetType?: StructureModifierTargetType;
};

export type SentenceStructureAnswer = {
  subject?: StructureFieldAnswer;
  verb?: StructureFieldAnswer;
  object?: StructureFieldAnswer;
  complement?: StructureFieldAnswer;
  modifiers?: StructureModifierAnswer[];
};

export type TranslationJudgeResult = "PASS" | "SOFT_PASS" | "FAIL";

export type TranslationChunkAnswer = {
  id: string;
  sourceSpan?: string;
  leadKo: string;
  acceptableAnswers: string[];
};

export type TranslationAnswer = {
  referenceKo: string;
  acceptableKeywords: string[];
  notes?: string[];
  chunks?: TranslationChunkAnswer[];
};

export const SENTENCE_FUNCTION_TYPES = [
  "scene_setting",
  "topic_sentence",
  "supporting_detail",
  "example",
  "transition",
  "contrast",
  "conclusion",
] as const;

export type SentenceFunctionType = (typeof SENTENCE_FUNCTION_TYPES)[number];

export const SENTENCE_FUNCTION_LABEL: Record<SentenceFunctionType, string> = {
  scene_setting: "상황 제시",
  topic_sentence: "주제 제시",
  supporting_detail: "뒷받침 설명",
  example: "예시",
  transition: "연결",
  contrast: "대조·전환",
  conclusion: "정리·결론",
};

export type SentenceFunctionAnswer = {
  correct: SentenceFunctionType;
  accepted?: SentenceFunctionType[];
  explanation?: string;
  clue?: string;
};

export type SentenceFunctionLog = {
  sentenceIndex: number;
  selectedType?: SentenceFunctionType;
  checked: boolean;
  isCorrect?: boolean;
  revealedAnswer: boolean;
  completed: boolean;
};

export type SentenceOrderMode = "unit_order" | "sentence_order";

export type SentenceOrderBlock = {
  id: string;
  text: string;
};

export type SentenceOrderItem = {
  id: string;
  mode: SentenceOrderMode;
  title?: string;
  instructions?: string;
  anchorBlock?: SentenceOrderBlock;
  shuffledBlocks: SentenceOrderBlock[];
  correctOrder: string[];
  acceptedOrders?: string[][];
  clue?: string;
  explanation?: string;
};

export type SentenceOrderLog = {
  itemIndex: number;
  selectedOrder: string[];
  checked: boolean;
  isCorrect?: boolean;
  revealedAnswer: boolean;
  completed: boolean;
};

/**
 * Composition v1
 * 기존 Stage4 v1과 호환 유지용
 */
export type CompositionChunk = {
  id: string;
  text: string;
  // 이 청크의 한글 생각단위 (있으면 Stage4가 translationAnswer 매칭 없이 직접 사용)
  textKo?: string;
};

export type CompositionAnswer = {
  promptKo: string;
  referenceEn: string;
  acceptedAnswers?: string[];
  notes?: string[];
  chunks: CompositionChunk[];
};

export type SentenceCompositionLog = {
  sentenceIndex: number;
  presentedChunkIds: string[];
  selectedChunkIds: string[];
  arrangementAttempts: number;
  arrangementPassed: boolean;
  typedEn: string;
  typingAttempts: number;
  revealedReference: boolean;
  completed: boolean;
};

/**
 * Composition v2
 * 한글 생각청크 → 영어 어순 배열 → click/type 혼합 작문
 */
export type CompositionKoChunkRole =
  | "subject"
  | "modifier"
  | "object"
  | "verb"
  | "adverb"
  | "place"
  | "time"
  | "other";

export type CompositionKoChunk = {
  id: string;
  text: string;
  role: CompositionKoChunkRole;
};

export type CompositionArrangementPattern = {
  id: string;
  orderedKoChunkIds: string[];
};

export type CompositionEnSlotType = "click" | "type";

export type CompositionEnSlot = {
  id: string;
  koChunkId: string;
  type: CompositionEnSlotType;
  label?: string;
  answer: string;
  acceptedAnswers?: string[];
};

export type CompositionAnswerV2 = {
  promptKo: string;
  koChunks: CompositionKoChunk[];
  arrangementPatterns: CompositionArrangementPattern[];
  enSlots: CompositionEnSlot[];
  referenceEn: string;
  notes?: string[];
};

export type SentenceCompositionLogV2 = {
  sentenceIndex: number;
  koPresentedChunkIds: string[];
  selectedKoChunkIds: string[];
  arrangementAttempts: number;
  arrangementPassed: boolean;
  matchedPatternId?: string;
  slotAnswers: Record<string, string>;
  slotCorrect: Record<string, boolean>;
  slotChecked: Record<string, boolean>;
  submissionAttempts: number;
  revealedReference: boolean;
  completed: boolean;
};

export type NaesinSentence = {
  id: string;
  text: string;
  structureAnswer?: SentenceStructureAnswer;
  translationAnswer?: TranslationAnswer;
  sentenceFunctionAnswer?: SentenceFunctionAnswer;
  compositionAnswer?: CompositionAnswer;
  compositionAnswerV2?: CompositionAnswerV2;
};

export type NaesinParagraph = {
  id: string;
  title?: string;
  label?: string;
  text?: string;
  sentences: NaesinSentence[];
};

export type NaesinPassage = {
  id: string;
  title: string;
  subtitle?: string;
  sourceLabel?: string;
  paragraphs: NaesinParagraph[];
  sentenceOrderItems?: SentenceOrderItem[];
};

export type UnknownWordMark = {
  id: string;
  word: string;
  normalizedWord: string;
  sentenceIndex: number;
  tokenIndex: number;
  checked: boolean;
  pos?: string;
  meaning?: string;
};

export type ModifierHeadLink = {
  id: string;
  modifier: string;
  head: string;
};

export type SentenceStructureLog = {
  sentenceIndex: number;
  subjectText?: string;
  verbText?: string;
  objectText?: string;
  complementText?: string;
  modifierText?: string;
  modifierLinks: ModifierHeadLink[];
};

export type TranslationChecklistKey =
  | "subjectChecked"
  | "verbChecked"
  | "logicChecked"
  | "modifierChecked";

export type TranslationChecklistState = Record<
  TranslationChecklistKey,
  boolean
>;

export type TranslationChunkLog = {
  chunkId: string;
  inputSuffix: string;
  attempts: number;
  isCorrect: boolean;
  revealedAnswer: boolean;
};

export type SentenceTranslationLog = {
  sentenceIndex: number;
  translationKo: string;
  retryTranslationKo: string;
  explanationRead: boolean;
  checklist?: Partial<TranslationChecklistState>;
  chunkLogs?: TranslationChunkLog[];
  completed?: boolean;
};

export function createEmptyStructureLog(
  sentenceIndex: number,
): SentenceStructureLog {
  return {
    sentenceIndex,
    subjectText: "",
    verbText: "",
    objectText: "",
    complementText: "",
    modifierText: "",
    modifierLinks: [],
  };
}

export function createEmptyTranslationLog(
  sentenceIndex: number,
): SentenceTranslationLog {
  return {
    sentenceIndex,
    translationKo: "",
    retryTranslationKo: "",
    explanationRead: false,
    checklist: {
      subjectChecked: false,
      verbChecked: false,
      logicChecked: false,
      modifierChecked: false,
    },
    chunkLogs: [],
    completed: false,
  };
}

export function createEmptyCompositionLog(
  sentenceIndex: number,
): SentenceCompositionLog {
  return {
    sentenceIndex,
    presentedChunkIds: [],
    selectedChunkIds: [],
    arrangementAttempts: 0,
    arrangementPassed: false,
    typedEn: "",
    typingAttempts: 0,
    revealedReference: false,
    completed: false,
  };
}

export function createEmptySentenceFunctionLog(
  sentenceIndex: number,
): SentenceFunctionLog {
  return {
    sentenceIndex,
    selectedType: undefined,
    checked: false,
    isCorrect: undefined,
    revealedAnswer: false,
    completed: false,
  };
}

export function createEmptySentenceOrderLog(
  itemIndex: number,
): SentenceOrderLog {
  return {
    itemIndex,
    selectedOrder: [],
    checked: false,
    isCorrect: undefined,
    revealedAnswer: false,
    completed: false,
  };
}

export function createEmptyCompositionLogV2(
  sentenceIndex: number,
): SentenceCompositionLogV2 {
  return {
    sentenceIndex,
    koPresentedChunkIds: [],
    selectedKoChunkIds: [],
    arrangementAttempts: 0,
    arrangementPassed: false,
    matchedPatternId: undefined,
    slotAnswers: {},
    slotCorrect: {},
    slotChecked: {},
    submissionAttempts: 0,
    revealedReference: false,
    completed: false,
  };
}

export function flattenPassageSentences(
  passage: NaesinPassage,
): NaesinSentence[] {
  return passage.paragraphs.flatMap((p) => p.sentences);
}

export type StructureMistakeType =
  | "role_mismatch"
  | "span_mismatch"
  | "type_mismatch"
  | "target_mismatch";

export type StructureMistakeLog = {
  sentenceIndex: number;
  part:
    | "subject"
    | "verb"
    | "object"
    | "complement"
    | "modifier";
  studentAnswer: string;
  expected: string[];
  mistakeType: StructureMistakeType;
  message: string;
  createdAt: string;
};
