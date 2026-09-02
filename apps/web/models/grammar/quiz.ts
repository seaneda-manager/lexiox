// 문법 퀴즈 뱅크 (Phase 1) — 선생님 배정 시험용 문항 풀

export type GrammarTrack = "updated-toefl" | "jr" | "middle" | "high";
export const GRAMMAR_TRACKS: GrammarTrack[] = ["updated-toefl", "jr", "middle", "high"];
export const GRAMMAR_TRACK_LABEL: Record<GrammarTrack, string> = {
  "updated-toefl": "Updated TOEFL",
  jr: "Jr.",
  middle: "중등",
  high: "고등",
};

export type QuizItemType = "fill" | "judgment";
export const QUIZ_ITEM_TYPES: QuizItemType[] = ["fill", "judgment"];
export const QUIZ_ITEM_TYPE_LABEL: Record<QuizItemType, string> = {
  fill: "빈칸 채우기",
  judgment: "정오 판단",
};

export type QuizItemSource = "ai" | "manual" | "import";
export type QuizItemStatus = "active" | "archived";

export type GrammarElement = {
  code: string;
  label_ko: string;
  label_en: string;
  category: string;
  order_index: number;
};

export type GrammarQuizItem = {
  id: string;
  stem: string;
  item_type: QuizItemType;
  answer: string;
  distractors: string[];
  element_code: string | null;
  track: GrammarTrack;
  word_count: number;
  vocab_level: number; // 1~5
  explanation: string | null;
  source: QuizItemSource;
  origin_drill_id: string | null;
  status: QuizItemStatus;
  created_at?: string;
  updated_at?: string;
};

// 저장/생성 입력 (id·타임스탬프 없이)
export type GrammarQuizItemInput = {
  stem: string;
  item_type: QuizItemType;
  answer: string;
  distractors?: string[];
  element_code?: string | null;
  track: GrammarTrack;
  vocab_level?: number;
  explanation?: string | null;
  source?: QuizItemSource;
};

// 선생님 필터 조건 (Phase 2에서 config.filters로 재사용)
export type QuizItemFilter = {
  tracks?: GrammarTrack[];
  element_codes?: string[];
  types?: QuizItemType[];
  vocab_level_max?: number;
  word_count_min?: number;
  word_count_max?: number;
};

/** 문장 토큰 수 (word_count 계산용, 서버·클라 공용) */
export function countWords(text: string): number {
  return (text || "").trim().split(/\s+/).filter(Boolean).length;
}

/** grammar_2026_units.level → quiz track 매핑 (드릴 임포트용) */
export function unitLevelToTrack(level: string | null | undefined): GrammarTrack {
  switch (level) {
    case "ms":
      return "middle";
    case "hs":
      return "high";
    case "toefl":
      return "updated-toefl";
    default:
      return "middle"; // 'all' 및 미지정 기본
  }
}
