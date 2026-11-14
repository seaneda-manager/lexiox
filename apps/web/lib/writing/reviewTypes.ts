// lib/writing/reviewTypes.ts
// Writing 학생용 AI 리뷰 + Drill 타입. 서버/클라이언트 공용(의존성 없음).

export type ReviewTaskKey = "email" | "discussion";

export interface GrammarPattern {
  /** 오류 경향 이름 (예: "관사 누락", "주어-동사 수일치") */
  pattern: string;
  /** 왜 틀리는지, 어떻게 고치는지 (한국어) */
  explanation: string;
  examples: { quote: string; correction: string }[];
}

export interface ComparisonRow {
  /** 비교 관점 (예: "서론", "근거 전개", "어조") */
  aspect: string;
  yours: string;
  model: string;
}

export interface TaskReview {
  /** 한국어 총평 2~4문장 */
  overview: string;
  /** 내용·논리상 부족한 부분 */
  contentGaps: { point: string; detail: string }[];
  /** 문법 오류 경향 */
  grammarPatterns: GrammarPattern[];
  /** 학생 답 vs 모범답안 비교 */
  comparison: ComparisonRow[];
  /** 향상 방법 — 문법 / 문맥·논리 / 단어 선택 */
  improvements: { grammar: string[]; context: string[]; wordChoice: string[] };
  /** 모범답안 1: 학생 답을 그대로 살려서 고친 버전 */
  improved: { text: string; changes: { change: string; why: string }[] };
  /** 모범답안 2: 구조부터 새로 쓴 버전 */
  facelift: { text: string; outline: { part: string; role: string }[]; structureNotes: string[] };
  /** Drill로 연습할 문법·문형 항목 */
  drillFocus: { tag: string; description: string }[];
}

export interface DrillChunkItem {
  id: string;
  kind: "chunk";
  tag: string;
  korean: string;
  /** 의미 단위로 나눈 정답 순서 */
  chunks: string[];
}

export interface DrillComposeItem {
  id: string;
  kind: "compose";
  tag: string;
  korean: string;
  answer: string;
  /** 반드시 써야 할 문형·문법 요소 (한국어 한 줄) */
  mustUse: string;
  hint: string;
}

export type DrillItem = DrillChunkItem | DrillComposeItem;

export interface WritingAiReview {
  version: 1;
  model: string;
  generatedAt: string;
  email: TaskReview | null;
  discussion: TaskReview | null;
  drill?: { generatedAt: string; items: DrillItem[] };
}

export const GRAMMAR_FOCUS_TAG_FALLBACK = "문장 구성";
