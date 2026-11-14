// lib/speaking/similarity.ts
// 따라 말하기/다시 말하기 채점용: 목표 문장과 인식된 문장을 단어 단위로 비교한다. (클라이언트/서버 공용)
// 음성 인식 결과는 구두점·대소문자를 믿을 수 없으므로 소문자 알파벳과 아포스트로피만 남겨 비교한다.

export interface DiffToken {
  word: string;
  /** hit: 말함 / miss: 빠뜨림 */
  state: "hit" | "miss";
}

const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9']/g, "");

export function tokens(text: string): string[] {
  return text.split(/\s+/).map(norm).filter(Boolean);
}

/** 목표 문장 기준 일치율(0~100)과 단어별 hit/miss. LCS 로 순서를 고려한다. */
export function compareSpoken(target: string, spoken: string): { score: number; diff: DiffToken[]; extra: string[] } {
  const rawTarget = target.split(/\s+/).filter(Boolean);
  const t = rawTarget.map(norm);
  const s = tokens(spoken);
  if (t.length === 0) return { score: 0, diff: [], extra: [] };

  const dp: number[][] = Array.from({ length: t.length + 1 }, () => new Array(s.length + 1).fill(0));
  for (let i = 1; i <= t.length; i++) {
    for (let j = 1; j <= s.length; j++) {
      dp[i][j] = t[i - 1] === s[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const hit = new Array(t.length).fill(false);
  const usedS = new Array(s.length).fill(false);
  let i = t.length;
  let j = s.length;
  while (i > 0 && j > 0) {
    if (t[i - 1] === s[j - 1]) {
      hit[i - 1] = true;
      usedS[j - 1] = true;
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) i--;
    else j--;
  }
  const matched = hit.filter(Boolean).length;
  const extra = s.filter((_, k) => !usedS[k]);
  // 군더더기 단어가 많으면 약간 감점
  const penalty = Math.min(0.15, (extra.length / Math.max(t.length, 1)) * 0.15);
  const score = Math.max(0, Math.round((matched / t.length - penalty) * 100));
  return {
    score,
    diff: rawTarget.map((w, k) => ({ word: w, state: hit[k] ? "hit" : "miss" })),
    extra,
  };
}
