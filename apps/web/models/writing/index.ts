// apps/web/models/writing/index.ts

// SSOT: 2026 Writing 타입/헬퍼는 이 파일에서만 import 하세요.
// (기존 레거시 writing 타입이 있다면, 새 코드에서는 여기만 사용)

/** 어떤 시험 포맷인지 (기존 vs 2026 개편) */
export type ExamEra = "ibt_legacy" | "ibt_2026";
export type WWritingExamEra = ExamEra;

/** Runner나 대시보드에서 쓸 최소 메타 정보 */
export interface WWritingTestMeta {
  id: string;
  label: string;
  examEra: ExamEra; // 2026용은 항상 "ibt_2026"
  source?: string | null; // 예: "demo", "tpo1", "mock-2026-1"
}

/** 2026 Writing에서 지원할 Task 타입 */
export type WWritingTaskKind =
  | "fill_in_blank" // 빈칸 채우기 형태의 작문
  | "micro_writing" // 10개의 짧은 쓰기 (레거시)
  | "build_a_sentence" // Updated TOEFL Task 1: 단어 뭉치 배열
  | "email" // Email Writing
  | "academic_discussion"; // Academic Discussion

/* ------------------------------------
 * 0. Build a Sentence (Updated TOEFL Task 1)
 * ----------------------------------*/

export interface WBuildSentenceQuestion {
  id: string;
  contextLeadIn: string;   // 문장 앞부분 (고정 텍스트)
  contextLeadOut: string;  // 문장 뒷부분 (고정 텍스트)
  shuffledChunks: string[]; // 셔플된 단어 뭉치 (정답 + 잉여 1개 포함)
  unnecessaryChunk?: string; // 잉여 단어 뭉치 (채점용, 화면에 노출 금지)
  correctSequence: string[]; // 정답 순서 (채점용)
}

export interface WBuildSentenceItem {
  id: string;
  taskKind: "build_a_sentence";
  instruction?: string;
  questions: WBuildSentenceQuestion[]; // 9문항
  timeLimitSeconds?: number; // 기본 360초 (6분)
}

/* ------------------------------------
 * 1. Fill-in-Blank Writing
 * ----------------------------------*/

export interface WFillBlankItem {
  id: string;
  taskKind: "fill_in_blank";
  title: string;
  /** HTML with {{BLANK_1}}, {{BLANK_2}} … placeholders */
  promptHtml: string;
  blanks: {
    id: string;
    placeholder?: string;
    sampleAnswer: string;
    minWords?: number;
  }[];
  recommendedTimeSeconds?: number;
}

/* ------------------------------------
 * 1. Micro Writing (10개 짧은 쓰기)
 * ----------------------------------*/

export interface WMicroPrompt {
  id: string; // 예: "micro-1", "micro-2"
  prompt: string; // 학생에게 보여줄 문장/질문
  minWords?: number; // 권장 최소 단어 수 (예: 20)
  maxWords?: number; // 권장 최대 단어 수 (예: 40)
}

export interface WMicroWritingItem {
  id: string; // 예: "task-micro-1"
  taskKind: "micro_writing";
  prompts: WMicroPrompt[]; // 보통 길이 10
  recommendedTimeSeconds?: number; // 전체 10문제 권장 시간 (예: 600초 = 10분)
}

/* ------------------------------------
 * 2. Email Writing
 * ----------------------------------*/

export interface WEmailWritingItem {
  id: string; // 예: "task-email-1"
  taskKind: "email";

  /** 상황 설명 (학생이 읽고 이해하는 배경 정보) */
  situation: string;

  /** 이메일에서 해야 할 일(요청/설명 등) 지시문 */
  prompt: string;

  /** 화면에 같이 보여줄 bullet 힌트/포인트 (선택) */
  hints?: string[];

  /** 권장 단어 범위 (예: { min: 100, max: 150 }) */
  wordLimit?: {
    min?: number;
    max?: number;
  };

  /** 권장 시간 (초 단위, 예: 600 = 10분) */
  recommendedTimeSeconds?: number;
}

/* ------------------------------------
 * 3. Academic Discussion
 * ----------------------------------*/

export interface WAcademicWritingItem {
  id: string; // 예: "task-acad-1"
  taskKind: "academic_discussion";

  /** 수업/토론 상황 설명 */
  context: string;

  /** 교수님(또는 강의자)의 질문/지시문 */
  professorPrompt: string;

  /** 이미 게시된 학생 글들 (선택) */
  studentPosts?: Array<{
    id: string;
    author: string; // 예: "Sungwoo", "Maya"
    content: string;
  }>;

  /** 권장 단어 범위 (예: { min: 120, max: 180 }) */
  wordLimit?: {
    min?: number;
    max?: number;
  };

  /** 권장 시간 (초 단위, 예: 900 = 15분) */
  recommendedTimeSeconds?: number;
}

/* ------------------------------------
 * 4. 전체 Writing Item 유니온
 * ----------------------------------*/

export type WWritingItem =
  | WBuildSentenceItem
  | WFillBlankItem
  | WMicroWritingItem
  | WEmailWritingItem
  | WAcademicWritingItem;

/* ------------------------------------
 * 5. 2026 Writing Test 전체 구조
 * ----------------------------------*/

export interface WWritingTest2026 {
  meta: WWritingTestMeta;
  /**
   * items 배열에는 보통 이런 순서로 들어가게 설계:
   *  - index 0: micro_writing (10 prompts)
   *  - index 1: email
   *  - index 2: academic_discussion
   *
   * 하지만 Runner는 taskKind를 보고 처리하도록 만들 예정이므로
   * 순서는 나중에 바뀌어도 크게 문제 없게 설계할 수 있음.
   */
  items: WWritingItem[];
}

/* ------------------------------------
 * 6. Scoring / 분석용 헬퍼 (연습 모드)
 * ----------------------------------*/

/**
 * Runner에서 answers를 넘길 때 key 규칙(제안):
 *  - Micro Writing:
 *      key = `${item.id}::${prompt.id}`
 *    예: item.id = "task-micro-1", prompt.id = "micro-3"
 *        → "task-micro-1::micro-3"
 *
 *  - Email:
 *      key = item.id
 *
 *  - Academic Discussion:
 *      key = item.id
 */

export interface WWritingTaskScore {
  /** wordCount: 공백 기준 단순 단어 수 */
  wordCount: number;

  /** 권장 범위와의 관계 */
  withinRecommended?: boolean;
  underMin?: boolean;
  overMax?: boolean;
}

export interface WMicroWritingScore {
  /** 몇 개 프롬프트에 답을 썼는지 */
  answeredCount: number;
  totalPrompts: number;
  /** 각 프롬프트별 wordCount */
  perPrompt: Record<string, WWritingTaskScore>;
  /** 전체 평균 단어 수 */
  averageWordsPerPrompt: number;
}

export interface WEmailScore extends WWritingTaskScore {}
export interface WAcademicScore extends WWritingTaskScore {}

export interface WWritingScore {
  /** 전체 섹션에서의 총 단어수 합 */
  totalWordCount: number;

  /** Micro / Email / Academic 각각의 세부 결과 */
  micro?: WMicroWritingScore;
  email?: WEmailScore;
  academic?: WAcademicScore;
}

/** 내부: 단어 수 세기 (공백 기준, 매우 단순 버전) */
function countWords(text: string | undefined | null): number {
  if (!text) return 0;
  // 공백, 줄바꿈, 탭 기준으로 split + 빈 문자열 제거
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

/** 권장 범위와 비교해서 score 플래그 채우기 */
function decorateWithRange(
  wordCount: number,
  limit?: { min?: number; max?: number }
): WWritingTaskScore {
  const base: WWritingTaskScore = { wordCount };

  if (!limit) return base;

  const { min, max } = limit;
  let withinRecommended = true;

  if (typeof min === "number" && wordCount < min) {
    withinRecommended = false;
    base.underMin = true;
  }
  if (typeof max === "number" && wordCount > max) {
    withinRecommended = false;
    base.overMax = true;
  }

  base.withinRecommended = withinRecommended;
  return base;
}

/**
 * 연습/분석용 Writing 스코어 계산
 * - 실제 ETS 채점이 아니라, 단어 수와 권장 범위 기준의 피드백용
 */
export function computeWritingScore(
  test: WWritingTest2026,
  answers: Record<string, string>
): WWritingScore {
  let totalWordCount = 0;

  let microScore: WMicroWritingScore | undefined;
  let emailScore: WEmailScore | undefined;
  let academicScore: WAcademicScore | undefined;

  for (const item of test.items) {
    if (item.taskKind === "micro_writing") {
      // Micro Writing: 프롬프트별로 wordCount 계산
      const perPrompt: Record<string, WWritingTaskScore> = {};
      let answeredCount = 0;
      let wordSum = 0;

      for (const p of item.prompts) {
        const key = `${item.id}::${p.id}`;
        const text = answers[key];
        const wc = countWords(text);
        if (wc > 0) answeredCount += 1;

        const score = decorateWithRange(wc, {
          min: p.minWords,
          max: p.maxWords,
        });

        perPrompt[p.id] = score;
        wordSum += wc;
        totalWordCount += wc;
      }

      const totalPrompts = item.prompts.length;
      microScore = {
        answeredCount,
        totalPrompts,
        perPrompt,
        averageWordsPerPrompt:
          totalPrompts > 0 ? wordSum / totalPrompts : 0,
      };
    } else if (item.taskKind === "email") {
      const text = answers[item.id] ?? "";
      const wc = countWords(text);
      const score = decorateWithRange(wc, item.wordLimit);
      totalWordCount += wc;
      emailScore = score;
    } else if (item.taskKind === "academic_discussion") {
      const text = answers[item.id] ?? "";
      const wc = countWords(text);
      const score = decorateWithRange(wc, item.wordLimit);
      totalWordCount += wc;
      academicScore = score;
    }
  }

  return {
    totalWordCount,
    micro: microScore,
    email: emailScore,
    academic: academicScore,
  };
}
