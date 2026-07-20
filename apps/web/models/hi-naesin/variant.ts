// models/hi-naesin/variant.ts

export const HI_NAESIN_VARIANT_TYPES = [
  'text_ordering',
  'blank_word',
  'blank_sentence',
  'irrelevant_sentence',
  'summary_fill',
  'fact',
  'negative_fact',
] as const;
export type HiNaesinVariantType = (typeof HI_NAESIN_VARIANT_TYPES)[number];

// ── payload 타입 ──────────────────────────

export type TextOrderingSegment = {
  id: string;   // 'A' | 'B' | 'C'
  text: string;
};

export type TextOrderingPayload = {
  fixedSegment: { text: string };          // 주어지는 첫 번째 단락
  segments: TextOrderingSegment[];         // 순서를 맞춰야 하는 3개
  correctOrder: string[];                  // ['B', 'A', 'C'] 등
};

export type BlankWordPayload = {
  markedPassage: string;  // 빈칸 위치를 ____로 표시한 지문
};

export type BlankSentencePayload = {
  markedPassage: string;  // 빈칸 위치를 [ ] 또는 ____로 표시한 지문
};

export type IrrelevantSentencePayload = {
  numberedPassage: string;   // ①②③④⑤ 번호 붙인 지문
  irrelevantIndex: number;   // 1-5
};

export type SummaryFillPayload = {
  summaryTemplate: string;   // (A), (B) 빈칸 표시된 요약문
  blankLabels: string[];     // ['(A)', '(B)']
};

// fact / negative_fact 는 보기가 전부 → payload 없음
export type FactPayload = Record<string, never>;

// ── 통합 타입 ────────────────────────────

export type VariantPayloadMap = {
  text_ordering:       TextOrderingPayload;
  blank_word:          BlankWordPayload;
  blank_sentence:      BlankSentencePayload;
  irrelevant_sentence: IrrelevantSentencePayload;
  summary_fill:        SummaryFillPayload;
  fact:                FactPayload;
  negative_fact:       FactPayload;
};

export type HiNaesinVariantChoice = {
  id: string;
  questionId: string;
  orderIndex: number;  // 1-5
  text: string;
  isCorrect: boolean;
};

export type HiNaesinVariantQuestion<T extends HiNaesinVariantType = HiNaesinVariantType> = {
  id: string;
  passageId: string;
  questionType: T;
  orderIndex: number;
  stem?: string | null;
  payload: VariantPayloadMap[T];
  explanation?: string | null;
  isPublished: boolean;
  choices?: HiNaesinVariantChoice[];
  createdAt: string;
  updatedAt: string;
};

export type HiNaesinVariantQuestionRow = {
  id: string;
  passage_id: string;
  question_type: string;
  order_index: number;
  stem: string | null;
  payload: Record<string, unknown>;
  explanation: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type HiNaesinVariantChoiceRow = {
  id: string;
  question_id: string;
  order_index: number;
  text: string;
  is_correct: boolean;
};

export function variantTypeLabel(t: HiNaesinVariantType): string {
  switch (t) {
    case 'text_ordering':       return '지문 배열';
    case 'blank_word':          return '빈칸 추론 (단어)';
    case 'blank_sentence':      return '빈칸 추론 (문장)';
    case 'irrelevant_sentence': return '어울리지 않는 문장';
    case 'summary_fill':        return '요약 빈칸';
    case 'fact':                return 'Fact (내용 일치)';
    case 'negative_fact':       return 'Negative Fact (내용 불일치)';
  }
}

export function defaultStem(t: HiNaesinVariantType): string {
  switch (t) {
    case 'text_ordering':
      return '주어진 글 다음에 이어질 글의 순서로 가장 적절한 것은?';
    case 'blank_word':
      return '다음 빈칸에 들어갈 말로 가장 적절한 것은?';
    case 'blank_sentence':
      return '다음 빈칸에 들어갈 말로 가장 적절한 것은?';
    case 'irrelevant_sentence':
      return '다음 글에서 전체 흐름과 관계없는 문장은?';
    case 'summary_fill':
      return '다음 글의 내용을 한 문장으로 요약하고자 한다. 빈칸 (A), (B)에 들어갈 말로 가장 적절한 것은?';
    case 'fact':
      return '다음 글의 내용과 일치하는 것은?';
    case 'negative_fact':
      return '다음 글의 내용과 일치하지 않는 것은?';
  }
}
