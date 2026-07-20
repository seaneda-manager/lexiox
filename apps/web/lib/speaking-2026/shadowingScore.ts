// lib/speaking-2026/shadowingScore.ts
// 목표 문장 vs STT transcript 단어 멀티셋 비교 — 임베딩/모델 없이 가벼운 채점

export type ShadowingTier = "perfect" | "good" | "pass" | "retry";

export type WordDiffEntry = { word: string; matched: boolean };

export type ShadowingScoreResult = {
  accuracy: number; // 0-100
  tier: ShadowingTier;
  diff: WordDiffEntry[];
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function tierFromAccuracy(accuracy: number): ShadowingTier {
  if (accuracy >= 90) return "perfect";
  if (accuracy >= 70) return "good";
  if (accuracy >= 50) return "pass";
  return "retry";
}

export function scoreShadowingAttempt(targetText: string, transcript: string): ShadowingScoreResult {
  const targetWords = tokenize(targetText);
  const heardWords = tokenize(transcript);

  if (targetWords.length === 0) {
    return { accuracy: 0, tier: "retry", diff: [] };
  }

  // multiset(가방) 매칭 — 중복 단어도 정확히 카운트, O(n)
  const remaining = new Map<string, number>();
  for (const w of heardWords) {
    remaining.set(w, (remaining.get(w) ?? 0) + 1);
  }

  let matchedCount = 0;
  const diff: WordDiffEntry[] = targetWords.map((word) => {
    const left = remaining.get(word) ?? 0;
    if (left > 0) {
      remaining.set(word, left - 1);
      matchedCount += 1;
      return { word, matched: true };
    }
    return { word, matched: false };
  });

  const accuracy = Math.round((matchedCount / targetWords.length) * 100);

  return { accuracy, tier: tierFromAccuracy(accuracy), diff };
}

export const TIER_BONUS: Record<ShadowingTier, number> = {
  perfect: 5,
  good: 2,
  pass: 0,
  retry: 0,
};
