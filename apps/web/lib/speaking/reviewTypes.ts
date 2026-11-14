// lib/speaking/reviewTypes.ts
// Speaking 학생용 리뷰 + 녹음 Drill 타입. 서버/클라이언트 공용(의존성 없음).

export interface SpeakingDeliveryStats {
  words: number;
  sentences: number;
  /** 군말(um, uh, like …) 개수 */
  fillers: { word: string; count: number }[];
  /** 분당 단어 수. 녹음 길이를 모르면 null */
  wpm: number | null;
  /** 같은 단어가 가까이서 반복된 횟수(대략) */
  repeats: number;
}

export interface SpeakingGrammarPattern {
  pattern: string;
  explanation: string;
  examples: { quote: string; correction: string }[];
}

export interface SpeakingComparisonRow {
  aspect: string;
  yours: string;
  model: string;
}

export interface SpeakingReview {
  overview: string;
  /** 답변 구성 요소(주장 / 이유 / 예시 / 마무리)별 진단 */
  structure: { part: string; present: boolean; comment: string }[];
  contentGaps: { point: string; detail: string }[];
  grammarPatterns: SpeakingGrammarPattern[];
  /** 전달력에 대한 해설(수치는 delivery 에서) */
  deliveryNotes: string[];
  comparison: SpeakingComparisonRow[];
  improvements: { grammar: string[]; context: string[]; wordChoice: string[]; delivery: string[] };
  /** 모범답안 ①: 내 스크립트를 살려서 고친 버전 (말하기 문체) */
  improved: { text: string; changes: { change: string; why: string }[] };
  /** 모범답안 ②: 구조부터 새로 쓴 버전 */
  facelift: { text: string; outline: { part: string; role: string }[]; structureNotes: string[] };
  drillFocus: { tag: string; description: string }[];
}

/** 듣고 따라 말하기 */
export interface ShadowItem {
  id: string;
  kind: "shadow";
  tag: string;
  /** 따라 말할 영어 문장 */
  text: string;
  korean: string;
}

/** 한글 뜻을 보고 고친 문장을 기억해서 말하기 */
export interface RecallItem {
  id: string;
  kind: "recall";
  tag: string;
  korean: string;
  answer: string;
  /** 핵심 단어 힌트 */
  hint: string;
}

/** 단문 말하기 모드: 지정 동사 / 지정 표현 / 지정 구조 / 힌트 없는 번역 */
export type PatternMode = "verb" | "expression" | "structure" | "free";

/** 단문 말하기(작문 대체): 한글 문장을 보고 영어로 말한다. 모드에 따라 제약이 달라진다. */
export interface PatternItem {
  id: string;
  kind: "pattern";
  mode: PatternMode;
  tag: string;
  korean: string;
  answer: string;
  /** 화면에 보여 줄 제약 (예: "동사: reconsider, postpone", "구조: 가정법 과거완료"). free 모드는 빈 문자열 */
  constraint: string;
  /** 채점기에 넘기는 필수 조건. free 모드는 빈 문자열 */
  mustUse: string;
}

export type SpeakingDrillItem = ShadowItem | RecallItem | PatternItem;

export interface SpeakingReviewBundle {
  version: 1;
  model: string;
  generatedAt: string;
  delivery: SpeakingDeliveryStats;
  review: SpeakingReview;
  drill?: { generatedAt: string; items: SpeakingDrillItem[] };
}
