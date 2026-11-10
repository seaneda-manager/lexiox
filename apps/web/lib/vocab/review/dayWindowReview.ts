// 단어 복습 규칙 (2026-11-10 확정):
//  Day N 학습 전에 직전 최대 3회차(N-3 ~ N-1)의 "틀린 단어"를 먼저 복습하고,
//  상한에 모자라면 같은 범위의 다른 단어를 랜덤으로 채운다. 1회차는 복습 없음.

export const REVIEW_WINDOW = 3;
export const REVIEW_CAP = 20;

/** Day N 의 복습 대상 Day 번호들 (오름차순). 1회차 이하는 빈 배열. */
export function reviewWindowDays(dayIndex: number | null | undefined, window: number = REVIEW_WINDOW): number[] {
  const n = Number(dayIndex);
  if (!Number.isFinite(n) || n <= 1) return [];
  const from = Math.max(1, n - window);
  const out: number[] = [];
  for (let d = from; d < n; d++) out.push(d);
  return out;
}

function shuffled<T>(arr: T[], rnd: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 복습 단어 id 선택: 틀린 단어 우선(상한 초과 시 그중 랜덤), 모자라면 나머지를 랜덤으로 채운다.
 * 반환 순서는 섞여 있다.
 */
export function pickReviewWordIds(input: {
  wrongIds: string[];
  windowIds: string[];
  cap?: number;
  rnd?: () => number;
}): { ids: string[]; wrongIds: string[] } {
  const cap = input.cap ?? REVIEW_CAP;
  const rnd = input.rnd ?? Math.random;
  const inWindow = new Set(input.windowIds);
  const wrong = [...new Set(input.wrongIds)].filter((id) => inWindow.has(id));
  const wrongPicked = shuffled(wrong, rnd).slice(0, cap);

  const rest = shuffled(
    [...inWindow].filter((id) => !wrongPicked.includes(id)),
    rnd,
  ).slice(0, Math.max(0, cap - wrongPicked.length));

  return { ids: shuffled([...wrongPicked, ...rest], rnd), wrongIds: wrongPicked };
}
