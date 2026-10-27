import type { BlankSegmentContent } from "@/models/grammar/types";

// 문법 관문(팝업 퀴즈) 공용 규칙: 채점 허용 오차, 정답 목록, 객관식 보기 구성.

/** 대소문자·공백(앞뒤/중간) 차이는 허용, 철자 차이는 오답 */
export function normalizeAnswer(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, "");
}

export function acceptedAnswers(c: BlankSegmentContent): string[] {
  const list = (c.answers ?? []).map((a) => a.trim()).filter(Boolean);
  if (list.length > 0) return list;
  return c.answer?.trim() ? [c.answer.trim()] : [];
}

export function isCorrectAnswer(c: BlankSegmentContent, input: string): boolean {
  const n = normalizeAnswer(input);
  if (!n) return false;
  return acceptedAnswers(c).some((a) => normalizeAnswer(a) === n);
}

/** 객관식 보기: 대표 정답 1개 + 오답 후보 (정답과 겹치는 것은 제외). 오답이 없으면 빈 배열(객관식 불가). */
export function buildOptions(c: BlankSegmentContent, shuffle: (a: string[]) => string[]): string[] {
  const answers = acceptedAnswers(c);
  if (answers.length === 0) return [];
  const accepted = new Set(answers.map(normalizeAnswer));
  const wrong = (c.options ?? [])
    .map((o) => o.trim())
    .filter((o) => o && !accepted.has(normalizeAnswer(o)));
  const uniqueWrong = Array.from(new Set(wrong)).slice(0, 3);
  if (uniqueWrong.length === 0) return [];
  return shuffle([answers[0], ...uniqueWrong]);
}

/** 포인트 (규칙은 추후 조정) */
export const GATE_POINTS = { correct: 3, penalty: 2 } as const;
