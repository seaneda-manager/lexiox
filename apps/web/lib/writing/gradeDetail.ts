// lib/writing/gradeDetail.ts
// Writing AI 채점 상세 결과의 타입 + 표시용 상수. 서버/클라이언트 공용(의존성 없음).
//
// ETS TOEFL iBT 2026 Writing: Email / Academic Discussion 은 각각 0~5점 홀리스틱 채점이고,
// 홀리스틱 점수는 아래 3개 기준(과제 수행 · 전개/구성 · 언어 사용)을 종합한 판단이다.
// 기준별 점수는 근거를 보여주는 진단 정보이며, 평균으로 홀리스틱을 대체하지 않는다.

export type WritingTaskKey = "email" | "discussion";
export type CriterionKey = "task" | "development" | "language";

export const CRITERIA: Record<WritingTaskKey, Record<CriterionKey, { label: string; hint: string }>> = {
  email: {
    task: {
      label: "과제 수행",
      hint: "요구 사항을 모두 다뤘는지, 수신자·목적에 맞는 어조(격식)인지",
    },
    development: {
      label: "전개·구성",
      hint: "인사·본문·맺음의 구조, 논리 순서, 세부 내용 보강",
    },
    language: {
      label: "언어 사용",
      hint: "문법 정확성, 어휘 범위·정확성, 문장 다양성, 철자·구두점",
    },
  },
  discussion: {
    task: {
      label: "토론 기여",
      hint: "질문에 직접 답했는지, 교수·동료 의견과 연결해 새 관점을 더했는지",
    },
    development: {
      label: "전개·근거",
      hint: "이유·예시·설명으로 주장을 뒷받침했는지, 논리 흐름",
    },
    language: {
      label: "언어 사용",
      hint: "문법 정확성, 어휘 범위·정확성, 문장 다양성, 철자·구두점",
    },
  },
};

export const ERROR_CATEGORIES = [
  "grammar",
  "vocabulary",
  "sentence_structure",
  "mechanics",
  "register",
  "cohesion",
  "task",
] as const;
export type ErrorCategory = (typeof ERROR_CATEGORIES)[number];

export const ERROR_CATEGORY_LABEL: Record<ErrorCategory, string> = {
  grammar: "문법",
  vocabulary: "어휘",
  sentence_structure: "문장 구조",
  mechanics: "철자·구두점",
  register: "어조·격식",
  cohesion: "연결·응집",
  task: "과제 이행",
};

export interface CriterionResult {
  score: number; // 0~5
  rationale: string; // 한국어, 근거 설명
  evidence: string[]; // 학생 답안에서 인용한 문장/구
}

export interface ErrorItem {
  quote: string; // 학생 답안 원문 (그대로 인용)
  category: ErrorCategory;
  issue: string; // 한국어 설명
  correction: string; // 수정안
}

export interface TaskGrade {
  holistic: number; // 0~5 정수
  criteria: Record<CriterionKey, CriterionResult>;
  strengths: string[];
  weaknesses: string[];
  errors: ErrorItem[];
  nextSteps: string[]; // 다음 점수대로 가기 위한 구체적 행동
  summary: string; // 한국어 2~3문장
}

export interface WordStats {
  words: number;
  sentences: number;
}

export interface WritingGradeDetail {
  version: 1;
  model: string;
  gradedAt: string;
  email: TaskGrade | null;
  discussion: TaskGrade | null;
  /** 두 번의 독립 채점 결과 (재현성 확인용). */
  passes: { email: number | null; discussion: number | null }[];
  wordStats: { email: WordStats | null; discussion: WordStats | null };
  /** 선생님이 확인해야 할 사유 (두 채점 불일치, 분량 부족, 답안 없음 등). */
  reviewFlags: string[];
  /** 선생님이 AI 상세 분석을 학생에게 공개하기로 했는지. */
  sharedWithStudent?: boolean;
}
