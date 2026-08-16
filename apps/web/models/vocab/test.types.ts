/* ======================================================
   Vocab Test Taker Types
====================================================== */

// ─────────────────────────────────────────────────────
// Test Config (Admin 설정)
// ─────────────────────────────────────────────────────

export type TestConfigScope = "global" | "class" | "student";
export type QuestionArrangement = "grouped" | "random";

export type VocabTestConfig = {
  id: string;
  scope: TestConfigScope;
  scope_id: string | null;
  coverage_ratio: number; // 30-100
  arrangement: QuestionArrangement;
  created_at: string;
  updated_at: string;
};

// ─────────────────────────────────────────────────────
// Test Session (시험 세션)
// ─────────────────────────────────────────────────────

export type TestSessionStatus =
  | "not_started"
  | "in_progress"
  | "submitted"
  | "graded";

export type VocabTestSession = {
  id: string;
  student_id: string;
  class_id: string;
  track_id: string;
  day_number: number;

  total_words_count: number; // Day의 전체 단어 수
  words_count: number; // 실제 시험에 포함된 단어 수

  use_wrong_only: boolean; // "틀린 것만 보기" 옵션 사용 여부

  status: TestSessionStatus;
  score: number | null; // 0-100 (정답률, 그대로 유지)
  correct_count: number | null;
  total_count: number | null;

  // 포인트 기반 점수 (힌트 차감 + 연속정답 보너스 반영)
  total_points: number;
  max_points: number | null;
  current_streak: number;
  best_streak: number;
  answered_count: number;
  hints_used: number;

  duration_seconds: number | null;

  started_at: string | null;
  submitted_at: string | null;

  created_at: string;
  updated_at: string;
};

// ─────────────────────────────────────────────────────
// Test Question (시험 문제)
// ─────────────────────────────────────────────────────

export type QuestionType =
  | "word_to_meaning"
  | "meaning_to_word"
  | "synonym"
  | "listening";

export type MultipleChoiceOption = {
  id: string;
  text?: string; // synonym
  audio_url?: string; // listening
  is_correct: boolean;
};

export type VocabTestQuestion = {
  id: string;
  session_id: string;
  question_number: number;

  word_id: string;
  word_text: string;

  question_type: QuestionType;

  // 객관식 (synonym, listening)
  options: MultipleChoiceOption[] | null;

  // 정답
  correct_answer: string; // 주관식: 단어, 객관식: option_id

  // 한국어 뜻 (주관식용)
  meaning_ko: string[] | null;

  // 오디오 URL (listening)
  audio_url: string | null;

  // 힌트 (0~2회 사용, 주관식만 해당)
  hint_level: number;

  // 학생 답변
  student_answer: string | null;
  is_correct: boolean | null;

  // 채점 결과 (포인트)
  points_earned: number | null; // null = 미채점
  points_max: number;
  streak_before: number | null;
  streak_bonus: number;

  created_at: string;
};

// ─────────────────────────────────────────────────────
// Test Taker UI (클라이언트)
// ─────────────────────────────────────────────────────

export type TestStartRequest = {
  track_id: string;
  day_number: number;
  use_wrong_only?: boolean; // "틀린 것만 보기" 옵션
};

export type TestStartResponse = {
  session_id: string;
  questions: VocabTestQuestion[];
  total_count: number;
};

export type AnswerSubmitRequest = {
  session_id: string;
  question_id: string;
  answer: string;
};

export type AnswerSubmitResponse = {
  question_id: string;
  is_correct: boolean;
  base_points: number;
  streak_bonus: number;
  points_earned: number;
  current_streak: number;
  best_streak: number;
  session_total_points: number;
};

export type HintRequest = {
  session_id: string;
  question_id: string;
};

export type HintResponse = {
  question_id: string;
  hint_level: 1 | 2;
  reveal: string;
  points_if_correct: number;
};

export type TestSubmitRequest = {
  session_id: string;
};

export type TestSubmitResponse = {
  session_id: string;
  score: number; // 정답률 0-100
  correct_count: number;
  total_count: number;
  duration_seconds: number;
  total_points: number;
  max_points: number;
  best_streak: number;
  hints_used: number;
};

// ─────────────────────────────────────────────────────
// Test Taker Progress (학습 완료 상태)
// ─────────────────────────────────────────────────────

export type LearningCompletionStatus = {
  prescreen_done: boolean;
  learning_stage_done: boolean;
  speed_done: boolean;
  memorization_done: boolean; // 깜지
  can_take_test: boolean;
};
