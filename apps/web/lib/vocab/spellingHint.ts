// 철자 입력 힌트 규칙 (prescreen / speed / test 공용)
//
// - 'full'  : 첫 글자 + 남은 글자 수만큼 밑줄 (학습·prescreen·speed)
// - 'shape' : 글자는 숨기고 단어 수(칸)만 표시 (시험: "help out" 같은 구가 2단어임을 알려줌)

export type SpellingHintMode = "full" | "shape";

export type HintToken =
  | { kind: "gap" }
  | { kind: "fixed"; char: string }
  | { kind: "blank"; char: string; revealed: boolean };

export type HintWord = HintToken[];

const FIXED_CHARS = /[-'’.]/;

/** 표시용 공백 정리 */
export function cleanAnswer(answer: string): string {
  return String(answer ?? "").trim().replace(/\s+/g, " ");
}

/** 구(2단어 이상) 여부 */
export function wordCount(answer: string): number {
  const c = cleanAnswer(answer);
  return c ? c.split(" ").length : 0;
}

/**
 * 정답을 단어별 토큰 배열로 변환한다.
 * @param extraReveal 첫 글자 외에 추가로 공개할 글자 수 (오답 시 점진적 힌트용, 'full' 모드만)
 */
export function buildHint(
  answer: string,
  mode: SpellingHintMode,
  extraReveal = 0,
): HintWord[] {
  const words = cleanAnswer(answer).split(" ").filter(Boolean);
  let remaining = mode === "full" ? Math.max(0, extraReveal) : 0;

  return words.map((w) => {
    const tokens: HintWord = [];
    [...w].forEach((ch, i) => {
      if (FIXED_CHARS.test(ch)) {
        tokens.push({ kind: "fixed", char: ch });
        return;
      }
      if (mode === "full" && i === 0) {
        tokens.push({ kind: "fixed", char: ch });
        return;
      }
      if (remaining > 0) {
        remaining -= 1;
        tokens.push({ kind: "blank", char: ch, revealed: true });
        return;
      }
      tokens.push({ kind: "blank", char: ch, revealed: false });
    });
    return tokens;
  });
}

/** 힌트에 포함된 글자 수 (고정 글자 제외하고 사용자가 쳐야 하는 칸 수) */
export function blankCount(hint: HintWord[]): number {
  return hint.reduce(
    (n, w) => n + w.filter((t) => t.kind === "blank" && !t.revealed).length,
    0,
  );
}

/** 접근성용 텍스트 설명 (예: "2단어, 첫 글자 h") */
export function hintLabel(answer: string, mode: SpellingHintMode): string {
  const n = wordCount(answer);
  const parts = [n >= 2 ? `${n}단어` : "1단어"];
  if (mode === "full") parts.push(`첫 글자 ${cleanAnswer(answer)[0] ?? ""}`);
  return parts.join(", ");
}

/** 입력값 비교용 정규화 (대소문자/공백/연속 공백 무시) */
export function normAnswer(s: unknown): string {
  return String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}
