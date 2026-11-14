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

/** 틀려서 고친 부분 (원문 조각 → 고친 조각) */
export interface FixChange {
  from: string;
  to: string;
}

/** 듣고 따라 말하기 */
export interface ShadowItem {
  id: string;
  kind: "shadow";
  tag: string;
  /** 따라 말할 영어 문장 (내가 실제로 말한 문장을 바르게 고친 것) */
  text: string;
  korean: string;
  /** 내가 실제로 말한 원래 문장 (있으면 고친 부분을 표시한다) */
  original?: string;
  changes?: FixChange[];
}

/** 듣고 기억해서 타이핑 (여러 번 들을 수 있지만 재청취마다 감점) */
export interface DictationItem {
  id: string;
  kind: "dictation";
  tag: string;
  text: string;
  korean: string;
}

/** 틀린 문장을 고쳐서 타이핑 → 고친 문장을 화면에서 지우고 말하기 */
export interface FixItem {
  id: string;
  kind: "fix";
  tag: string;
  /** 문법 오류가 들어 있는 문장 (학생이 실제로 한 실수 기반) */
  wrong: string;
  /** 바르게 고친 문장 */
  answer: string;
  /** 왜 틀렸는지 한 줄 (한국어) */
  explanation: string;
  /** 고친 문장의 한글 뜻 (말하기 단계에서 화면에 계속 보인다) */
  korean?: string;
  /** 틀려서 고친 부분 */
  changes?: FixChange[];
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

/** 말하기 단어시험 항목: 한글 뜻 → 영어 단어/이어동사/숙어 말하기 */
export type VocabKind = "word" | "phrasal" | "idiom";

export interface SpeakingVocabEntry {
  id: string;
  /** 정답 표현 (자리표시자 없이 깨끗한 형태. 예: "look into", "in the long run") */
  en: string;
  /** 인식·채점에서 함께 인정할 변형 (예: 과거형) */
  alts: string[];
  ko: string;
  kind: VocabKind;
  /** 이 표현이 쓰인 짧은 예문 */
  example: string;
  /** 어디서 나온 표현인지 */
  source: "model" | "student";
}

export type SpeakingDrillItem = ShadowItem | DictationItem | FixItem | RecallItem | PatternItem;

export interface SpeakingReviewBundle {
  version: 1;
  model: string;
  generatedAt: string;
  delivery: SpeakingDeliveryStats;
  review: SpeakingReview;
  drill?: { generatedAt: string; items: SpeakingDrillItem[] };
  vocab?: { generatedAt: string; items: SpeakingVocabEntry[] };
  /** 선생님 검수 상태. 없으면(예전 데이터) 공개로 본다. */
  status?: "draft" | "published";
  publishedAt?: string;
  publishedBy?: string;
}

export const isPublishedBundle = (b: { status?: string } | null | undefined) => !!b && (!b.status || b.status === "published");
