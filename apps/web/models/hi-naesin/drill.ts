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
  }
}
