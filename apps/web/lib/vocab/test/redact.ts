import type { VocabTestQuestion } from "@/models/vocab/test.types";
import { hintReveal, hintsAllowed } from "./scoring";

/**
 * 클라이언트로 내려보내는 문제에서 정답 정보를 제거한다.
 * 정답/채점은 서버(answer API)만 알고, 답을 낸 뒤에야 reveal 로 돌려준다.
 * 이미 답한 문제(is_correct !== null)는 정답을 보여줘도 되므로 그대로 둔다.
 */
export function redactQuestionForClient(q: VocabTestQuestion): VocabTestQuestion {
  if (q.is_correct !== null) return q;

  return {
    ...q,
    correct_answer: "",
    options: q.options ? q.options.map((o) => ({ ...o, is_correct: false })) : null,
    // 단어→뜻 문제는 meaning_ko 가 곧 정답이다. 뜻→단어 문제는 이 값이 문제 본문이라 유지한다.
    meaning_ko: q.question_type === "word_to_meaning" ? null : q.meaning_ko,
  };
}

/** 답을 제출한 직후 클라이언트에 알려주는 정답 정보 */
export function buildReveal(q: {
  correct_answer: string;
  meaning_ko: string[] | null;
}): { correct_answer: string; meaning_ko: string[] | null } {
  return { correct_answer: q.correct_answer, meaning_ko: q.meaning_ko ?? null };
}

/** 이어하기 시 이미 사용한 힌트의 공개 문자열을 복원한다 */
export function rebuildHintReveals(
  questions: Array<Pick<VocabTestQuestion, "id" | "question_type" | "correct_answer" | "hint_level" | "is_correct" | "options">>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const q of questions) {
    if (q.is_correct !== null || q.options) continue;
    if (!hintsAllowed(q.question_type) || !q.hint_level) continue;
    out[q.id] = hintReveal(q.question_type, q.correct_answer, q.hint_level as 1 | 2);
  }
  return out;
}
