// models/hi-naesin/drill.ts

export const HI_NAESIN_DRILL_TYPES = [
  'translation',
  'translation_arrange',
  'translation_choice',
  'fill_blank',
  'writing',
  'writing_arrange',
  'summary',
  'grammar_choice',
  'vocab',
  'identify_categorize',
] as const;
export type HiNaesinDrillType = (typeof HI_NAESIN_DRILL_TYPES)[number];

// ── payload 타입 ──────────────────────────

export type TranslationPayload = {
  sentenceEn: string;
  answerKo: string;
};

export type TranslationArrangePayload = {
  sentenceEn: string;
  chunks: Array<{ id: string; ko: string }>; // 정답 순서
};

export type WritingArrangePayload = {
  koPrompt: string;
  chunks: Array<{ id: string; en: string }>; // 정답 순서
};

export type TranslationChoicePayload = {
  sentenceEn: string;
  options: Array<{ key: 'a' | 'b' | 'c'; text: string }>;
  correct: 'a' | 'b' | 'c';
  explanation?: string;
};

export type FillBlankPayload = {
  sentenceTemplate: string; // 빈칸은 ____ 로 표시
  answer: string;
  distractors: string[];    // 3개 권장
  sentenceKo?: string;      // 한국어 힌트 (선택)
};

export type WritingPayload = {
  koPrompt: string;
  answerEn: string;
  acceptableAnswers?: string[];
  wordCount?: number;       // 총 단어 수
  hintWords?: string[];     // 핵심 단어 힌트 (2~3개)
  grammarHints?: string[];  // 문법 포인트 힌트
};

export type SummaryBlank = {
  answer: string;
  distractors: string[];
};

export type SummaryPayload = {
  template: string;         // 빈칸은 (A), (B) 등으로 표시
  blanks: SummaryBlank[];
};

export type VocabPayload = {
  word: string;          // 영어 단어/표현
  meaningKo: string;     // 한국어 뜻
  exampleSentence?: string; // 지문 속 예문 (선택)
  isExpression?: boolean;   // true면 숙어/표현 (문제 모드 3에서 활용)
};

export type GrammarChoicePayload = {
  sentenceTemplate: string; // 빈칸은 ____ 로 표시
  optionA: string;
  optionB: string;
  optionC?: string;          // 4지선다용
  optionD?: string;          // 4지선다용
  correct: 'a' | 'b' | 'c' | 'd';
  explanation?: string;
  grammarCategory?: string;  // e.g. '시제', '수 일치', '관계사', '연결어'
  contextBefore?: string;    // 연결어 드릴: 앞 문장 (맥락 제공)
};

// ── identify → categorize 공용 엔진 ──────────
// 청킹(2층)·지칭추론·킬포 퀴즈를 하나의 엔진으로 커버.
// identify = 원문 구간(span) 맞히기 / categorize = 구간의 유형(category) 고르기.

export type ICCategoryOption = {
  key: string;   // 정답 대조용 키
  label: string; // 화면 표시
};

export type ICTarget = {
  span: string;                   // identify 정답 구간 (원문 부분 문자열)
  anchor?: string;                // 지칭=referent(가리키는 대상) / 수식=피수식어
  category?: string;              // categorize 정답 key (depth>=2 일 때 사용)
  options?: ICCategoryOption[];   // categorize 보기
  elementTag?: string;            // 요소별 분석 태그 e.g. 'ref:whole-clause', 'mod:adj-clause'
  explanation?: string;
};

export type ICMode = 'reference' | 'modifier' | 'chunk';

export type IdentifyCategorizePayload = {
  mode: ICMode;
  sentence: string;               // 학생에게 보여줄 문장
  depth: 1 | 2 | 3 | 4;           // 1=identify만, 2+=categorize 포함/세분
  instruction?: string;           // 문항별 안내 (선택)
  targets: ICTarget[];            // 1개 이상 (청킹은 여러 개, 지칭은 보통 1개)
};

// 학생 응답 형태 (response_choice 에 JSON 문자열로 저장)
export type ICResponse = {
  spans: string[];                 // targets 순서에 맞춘 학생 선택 구간
  cats: (string | null)[];         // targets 순서에 맞춘 학생 선택 카테고리 key
};

// ── 통합 타입 ────────────────────────────

export type DrillPayloadMap = {
  translation:          TranslationPayload;
  translation_arrange:  TranslationArrangePayload;
  translation_choice:   TranslationChoicePayload;
  fill_blank:           FillBlankPayload;
  writing:              WritingPayload;
  writing_arrange:      WritingArrangePayload;
  summary:              SummaryPayload;
  grammar_choice:       GrammarChoicePayload;
  vocab:                VocabPayload;
  identify_categorize:  IdentifyCategorizePayload;
};

export type HiNaesinDrill<T extends HiNaesinDrillType = HiNaesinDrillType> = {
  id: string;
  passageId: string;
  drillType: T;
  orderIndex: number;
  payload: DrillPayloadMap[T];
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

export type HiNaesinDrillRow = {
  id: string;
  passage_id: string;
  drill_type: string;
  order_index: number;
  payload: Record<string, unknown>;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export function drillTypeLabel(t: HiNaesinDrillType): string {
  switch (t) {
    case 'translation':          return '해석';
    case 'translation_arrange':  return '해석 배열';
    case 'translation_choice':   return '해석 3지선다';
    case 'fill_blank':           return '빈칸 넣기';
    case 'writing':              return '작문';
    case 'writing_arrange':      return '작문 배열';
    case 'summary':               return '요약';
    case 'grammar_choice':        return '문법 고르기';
    case 'vocab':                 return '단어';
    case 'identify_categorize':   return '구조 분석';
  }
}
