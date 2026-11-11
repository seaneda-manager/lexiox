// 학년 일괄 진급 (수동): academy_students.grade 는 "고1" 같은 자유 텍스트라서
// 문자열을 해석해 한 학년 올린다. 해석 못 하면 건드리지 않는다.

export type PromotionKind = "up" | "school_change" | "graduate" | "unknown";

export type PromotionPlan = {
  current: string | null;
  next: string | null; // unknown/graduate 이면 null
  kind: PromotionKind;
};

const LEVELS: Array<{ prefix: string; max: number; nextPrefix: string | null }> = [
  { prefix: "초", max: 6, nextPrefix: "중" },
  { prefix: "중", max: 3, nextPrefix: "고" },
  { prefix: "고", max: 3, nextPrefix: null },
];

const LONG_NAMES: Record<string, string> = {
  초등: "초",
  초등학교: "초",
  중등: "중",
  중학: "중",
  중학교: "중",
  고등: "고",
  고등학교: "고",
  고: "고",
  중: "중",
  초: "초",
  M: "중",
  H: "고",
  E: "초",
};

/** "고1", "고 1", "중학교 2학년", "H1", "M3" → { prefix: "고", n: 1 } */
export function parseGrade(raw: string | null | undefined): { prefix: string; n: number } | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const m = s.match(/^(초등학교|초등|중학교|중학|중등|고등학교|고등|초|중|고|[MHE])\s*([1-6])\s*(학년)?$/i);
  if (!m) return null;
  const key = m[1].length === 1 && /[a-z]/i.test(m[1]) ? m[1].toUpperCase() : m[1];
  const prefix = LONG_NAMES[key];
  const n = Number(m[2]);
  const level = LEVELS.find((l) => l.prefix === prefix);
  if (!level || n < 1 || n > level.max) return null;
  return { prefix, n };
}

/** 한 학년 진급 계획. 표기는 "고1" 형태로 정규화한다. */
export function planPromotion(raw: string | null | undefined): PromotionPlan {
  const current = String(raw ?? "").trim() || null;
  const p = parseGrade(current);
  if (!p) return { current, next: null, kind: "unknown" };
  const level = LEVELS.find((l) => l.prefix === p.prefix)!;
  if (p.n < level.max) return { current, next: `${p.prefix}${p.n + 1}`, kind: "up" };
  if (level.nextPrefix) return { current, next: `${level.nextPrefix}1`, kind: "school_change" };
  return { current, next: null, kind: "graduate" };
}
