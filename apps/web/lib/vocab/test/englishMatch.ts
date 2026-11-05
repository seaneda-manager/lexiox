/**
 * 영어 철자 비교용 정규화.
 * 숙어·이어동사("give up", "look forward to")는 띄어쓰기·하이픈·아포스트로피·대소문자 차이를 무시한다.
 */
export function normEnglish(s: unknown): string {
  return String(s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]/g, "");
}

export function sameEnglish(a: unknown, b: unknown): boolean {
  const x = normEnglish(a);
  return x.length > 0 && x === normEnglish(b);
}

/** 입력 중 허용 문자: 영문·숫자·공백·하이픈·아포스트로피 (숙어 입력 시 띄어쓰기 유지) */
export function cleanTypedEnglish(s: string): string {
  return String(s ?? "").replace(/[^a-zA-Z0-9 '\-]/g, "").replace(/\s{2,}/g, " ");
}
