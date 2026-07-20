export const MIDDLE_DRILL_STAGE_IDS = [
  'vocab',
  'reading',
  'structure_analysis',
  'grammar_label',
  'translation',
  'fill_blank',
  'composition',
  'read_aloud',
] as const;

export type MiddleDrillStageId = (typeof MIDDLE_DRILL_STAGE_IDS)[number];

export type MiddleDrillStageConfig = {
  id: MiddleDrillStageId;
  label: string;
  optional: boolean;
};

export const MIDDLE_DRILL_STAGES: MiddleDrillStageConfig[] = [
  { id: 'vocab',              label: '단어 확인',      optional: false },
  { id: 'reading',            label: '본문 읽기',      optional: false },
  { id: 'structure_analysis', label: '구조 분석',      optional: false },
  { id: 'grammar_label',      label: '문법 레이블링',  optional: false },
  { id: 'translation',        label: '해석',           optional: false },
  { id: 'fill_blank',         label: '빈칸 채우기',    optional: false },
  { id: 'composition',        label: '작문',           optional: false },
  { id: 'read_aloud',         label: '소리내어 읽기',  optional: true  },
];

export const MIDDLE_DRILL_STAGE_LABEL: Record<MiddleDrillStageId, string> =
  Object.fromEntries(
    MIDDLE_DRILL_STAGES.map((s) => [s.id, s.label]),
  ) as Record<MiddleDrillStageId, string>;

export const MIDDLE_DRILL_STAGE_ORDER = MIDDLE_DRILL_STAGES.map(
  (s) => s.id,
) as MiddleDrillStageId[];

// ── Structure analysis types ──────────────────────────────────────

export type SentenceStructure = {
  subject: string;
  verb: string;
  object: string;
  complement: string;
};

// ── Grammar label types ──────────────────────────────────────────

export const MIDDLE_GRAMMAR_PATTERNS = [
  // 문장 형식
  '1형식', '2형식', '3형식', '4형식', '5형식',
  // 시제
  '현재', '과거', '미래', '현재완료', '과거완료', '진행형',
  // 조동사
  'can', 'will', 'must', 'should', 'may',
  // 태
  '수동태',
  // 준동사
  '부정사(명사)', '부정사(형용사)', '부정사(부사)',
  '동명사', '현재분사', '과거분사',
  // 접속사/관계사
  '관계대명사', '관계부사', '접속사', '간접의문문',
  // 비교
  '비교급', '최상급',
  // 기타
  '가정법', '분사구문', '강조', '도치',
] as const;

export type MiddleGrammarPattern = (typeof MIDDLE_GRAMMAR_PATTERNS)[number];

// ── Sentence data ─────────────────────────────────────────────────

export type MiddleDrillSentence = {
  index: number;
  en: string;
  ko: string | null;
  fillBlankWord: string;
  fillBlankTemplate: string;
  // Teacher-annotated answers (stored in extra_data, may be absent)
  structureAnswer?: SentenceStructure;
  grammarAnswers?: MiddleGrammarPattern[];
};

export type MiddleDrillVocabItem = {
  index: number;
  word: string;
  definition: string;
  example: string | null;
};

export type MiddleDrillData = {
  unitId: string;
  contentId: string;
  contentTitle: string | null;
  sentences: MiddleDrillSentence[];
  vocab: MiddleDrillVocabItem[];
};
