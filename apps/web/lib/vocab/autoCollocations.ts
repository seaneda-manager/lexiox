// apps/web/lib/vocab/autoCollocations.ts

type Options = {
  maxPhrases?: number; // default 12
  window?: number; // right window size (default 3)
  minLen?: number; // minimum token length (default 2)
};

/**
 * Client-safe collocation auto generation from examples.
 * Output strings are parseable by parseCollocationString in drill builder:
 *   "base|right phrase"
 */
export function autoGenerateCollocationsFromExamples(
  baseWordRaw: string,
  examplesEn: string[],
  opts?: Options,
): string[] {
  const baseWord = clean(baseWordRaw);
  if (!baseWord) return [];

  const maxPhrases = clampInt(opts?.maxPhrases ?? 12, 1, 50);
  const window = clampInt(opts?.window ?? 3, 1, 6);
  const minLen = clampInt(opts?.minLen ?? 2, 1, 10);

  const baseLower = baseWord.toLowerCase();
  const baseForms = new Set<string>([
    baseLower,
    // tiny heuristic forms
    `${baseLower}s`,
    `${baseLower}es`,
    `${baseLower}ed`,
    `${baseLower}ing`,
  ]);

  const counts = new Map<string, number>();

  for (const sRaw of examplesEn ?? []) {
    const s = clean(sRaw);
    if (!s) continue;

    const tokens = tokenize(s);
    if (tokens.length < 2) continue;

    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i]!;
      const tLower = t.toLowerCase();

      if (!baseForms.has(tLower)) continue;

      // take right side phrases: 1..window tokens
      for (let k = 1; k <= window; k++) {
        const slice = tokens.slice(i + 1, i + 1 + k).map(clean).filter(Boolean);
        if (slice.length === 0) continue;

        // filter out ultra-short tokens like "a", "to" if minLen demands
        const filtered = slice.filter((w) => w.length >= minLen);
        if (filtered.length === 0) continue;

        const right = filtered.join(" ");
        const key = `${baseWord}|${right}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
  }

  // If nothing found, fall back to frequent bigrams/trigrams that start with baseWord (looser)
  if (counts.size === 0) {
    for (const sRaw of examplesEn ?? []) {
      const s = clean(sRaw);
      if (!s) continue;

      const tokens = tokenize(s);
      for (let i = 0; i < tokens.length - 1; i++) {
        const t = tokens[i]!;
        if (t.toLowerCase() !== baseLower) continue;

        const next = tokens[i + 1]!;
        if (clean(next).length < minLen) continue;
        const key = `${baseWord}|${clean(next)}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
  }

  const ranked = Array.from(counts.entries())
    .sort((a, b) => {
      const diff = (b[1] ?? 0) - (a[1] ?? 0);
      if (diff !== 0) return diff;
      // stable-ish tiebreak: shorter right phrase first
      return a[0].length - b[0].length;
    })
    .map(([k]) => k);

  // de-dupe by right phrase (avoid "base|the" duplicates, etc.)
  const out: string[] = [];
  const seenRight = new Set<string>();

  for (const k of ranked) {
    if (out.length >= maxPhrases) break;
    const [left, right] = k.split("|");
    const r = clean(right);
    if (!left || !r) continue;

    const rKey = r.toLowerCase();
    if (seenRight.has(rKey)) continue;
    seenRight.add(rKey);

    out.push(`${baseWord}|${r}`);
  }

  return out.slice(0, maxPhrases);
}

/* =========================
 * Helpers
 * ========================= */

function tokenize(s: string): string[] {
  // keep letters and apostrophes inside words
  const raw = s
    .replace(/[\u2019]/g, "'")
    .split(/[^A-Za-z']+/g)
    .map(clean)
    .filter(Boolean);

  return raw;
}

function clean(v: unknown): string {
  return String(v ?? "").trim();
}

function clampInt(n: number, lo: number, hi: number): number {
  const x = Number.isFinite(n) ? Math.floor(n) : lo;
  return Math.max(lo, Math.min(hi, x));
}
