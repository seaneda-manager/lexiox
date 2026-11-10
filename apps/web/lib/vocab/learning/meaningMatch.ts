/**
 * 학습 단계 "뜻 입력" 채점 도우미.
 * - 괄호 안 설명, "~", "…" 같은 부가 표기는 받아쓰지 않아도 된다.
 * - 아무 글자나 넣고 넘어가지 못하도록, 실제 뜻과 충분히 비슷한지 확인한다.
 */

/** "명분; 정당화" 같은 항목을 낱개 뜻으로 펼친다. */
export function flattenMeanings(meanings: string[] | null | undefined): string[] {
  const out: string[] = [];
  for (const m of meanings ?? []) {
    for (const part of String(m ?? "").split(/[;；]/)) {
      const t = part.trim();
      if (t && t !== "(뜻 미입력)") out.push(t);
    }
  }
  return out;
}

export type MeaningGroup = { pos: string; items: string[] };

/** 뜻별 품사가 있으면 같은 품사끼리 묶는다. 길이가 안 맞거나 없으면 null(묶지 않음). */
export function groupMeaningsByPos(
  meanings: string[] | null | undefined,
  meaningPos: string[] | null | undefined,
): MeaningGroup[] | null {
  const flat = flattenMeanings(meanings);
  if (!flat.length || !meaningPos || meaningPos.length !== flat.length) return null;
  const groups: MeaningGroup[] = [];
  flat.forEach((m, i) => {
    const pos = (meaningPos[i] || "").trim();
    if (!pos) return;
    const g = groups.find((x) => x.pos === pos);
    if (g) g.items.push(m);
    else groups.push({ pos, items: [m] });
  });
  return groups.length ? groups : null;
}

/** 괄호(내용 포함)·~·…·공백·기호를 제거한 비교용 핵심 문자열. */
export function coreMeaning(s: string): string {
  return String(s ?? "")
    .replace(/\([^)]*\)|（[^）]*）|\[[^\]]*\]/g, "")
    .replace(/[~～…]|\.{2,}/g, "")
    .replace(/[^0-9a-zA-Z가-힣]/g, "")
    .toLowerCase();
}

function bigrams(s: string): string[] {
  if (s.length < 2) return [s];
  const out: string[] = [];
  for (let i = 0; i < s.length - 1; i++) out.push(s.slice(i, i + 2));
  return out;
}

function dice(a: string, b: string): number {
  const x = bigrams(a);
  const y = bigrams(b);
  const pool = [...y];
  let hit = 0;
  for (const g of x) {
    const i = pool.indexOf(g);
    if (i >= 0) {
      hit++;
      pool.splice(i, 1);
    }
  }
  return (2 * hit) / (x.length + y.length);
}

export type MeaningMatch = "exact" | "close" | "none";

/** 입력이 주어진 뜻 목록 중 하나와 일치하면 exact, 비슷하면 close, 아니면 none. */
export function matchMeaning(typed: string, meanings: string[]): MeaningMatch {
  const t = coreMeaning(typed);
  if (!t) return "none";
  let best: MeaningMatch = "none";
  for (const m of meanings) {
    const c = coreMeaning(m);
    if (!c) continue; // 괄호만 있는 뜻은 비교 대상에서 제외
    if (t === c) return "exact";
    const contained = t.length >= 2 && (c.includes(t) || t.includes(c)) && Math.min(t.length, c.length) / Math.max(t.length, c.length) >= 0.6;
    if (contained || (t.length >= 2 && dice(t, c) >= 0.6)) best = "close";
  }
  return best;
}
