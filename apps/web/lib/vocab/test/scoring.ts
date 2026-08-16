import type { QuestionType } from "@/models/vocab/test.types";

/**
 * 시험 문제 채점/포인트 계산 (힌트 차감 + 연속정답 보너스)
 */

export const POINTS_BASE = 3;
export const MAX_HINT_LEVEL = 2;
export const STREAK_CAP = 5;

const HINTABLE_TYPES: QuestionType[] = ["word_to_meaning", "meaning_to_word"];

export function hintsAllowed(questionType: QuestionType): boolean {
  return HINTABLE_TYPES.includes(questionType);
}

/** 힌트 사용 횟수(0~2)에 따른 문제당 만점 (3점 → 2점 → 1점) */
export function basePointsFor(hintLevel: number): number {
  return Math.max(POINTS_BASE - hintLevel, 1);
}

/** 연속 정답(streak) 보너스: 기본점수 * min(streak,5) * 10% */
export function streakBonus(base: number, streakBefore: number): number {
  return Math.round(base * Math.min(streakBefore, STREAK_CAP) * 0.1);
}

export type AnswerScore = {
  is_correct: boolean;
  base_points: number;
  streak_bonus: number;
  points_earned: number;
  streak_after: number;
};

export function scoreAnswer(i: {
  questionType: QuestionType;
  isCorrect: boolean;
  hintLevel: number;
  streakBefore: number;
}): AnswerScore {
  if (!i.isCorrect) {
    return {
      is_correct: false,
      base_points: 0,
      streak_bonus: 0,
      points_earned: 0,
      streak_after: 0,
    };
  }

  const base = hintsAllowed(i.questionType)
    ? basePointsFor(i.hintLevel)
    : POINTS_BASE;
  const bonus = streakBonus(base, i.streakBefore);

  return {
    is_correct: true,
    base_points: base,
    streak_bonus: bonus,
    points_earned: base + bonus,
    streak_after: i.streakBefore + 1,
  };
}

/**
 * 힌트 공개 문자열 생성.
 * - meaning_to_word: 정답(영단어) 앞 1자 / 3자 그대로 공개
 * - word_to_meaning: 정답(한글 뜻) 앞 1자 / 3자 공개하되, 뜻 길이의 절반을 넘지 않도록 제한
 * 공개되지 않은 나머지 글자는 '·'로 마스킹 (단어 길이는 드러남)
 */
export function hintReveal(
  questionType: QuestionType,
  correctAnswer: string,
  hintLevel: 1 | 2
): string {
  const rawLen = hintLevel === 1 ? 1 : 3;
  const revealLen =
    questionType === "word_to_meaning"
      ? Math.min(rawLen, Math.ceil(correctAnswer.length / 2))
      : rawLen;

  const shown = correctAnswer.slice(0, Math.min(revealLen, correctAnswer.length));
  const maskedRest = "·".repeat(Math.max(correctAnswer.length - shown.length, 0));

  return shown + maskedRest;
}
