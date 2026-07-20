export type ReadingTask = "CTW" | "DAILY" | "ACADEMIC";
export type Branch = "LOWER" | "HIGHER";

export type ModuleCounts = {
  ctwTotal: number;
  dailyTotal: number;
  academicTotal: number;
};

export type ModuleCorrect = {
  ctwCorrect: number;
  dailyCorrect: number;
  academicCorrect: number;
};

// Higher-only hard-correct count (cap 3)
export type HigherHardMeta = {
  hardCorrectCount: number; // INFERENCE / NEGATIVE_FACT / (HARD) PURPOSE correct count
};

export type ScoreResult = {
  m1: number;           // 0..1
  route: Branch;
  m2: number;           // 0..1 (raw weighted)
  m2Bonus: number;      // 0..0.06
  theta: number;        // 0..1
  scaled: number;       // 0..30 (after cap)
};

function clamp01(x: number) {
  if (Number.isNaN(x) || !Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function pct(correct: number, total: number) {
  if (!total || total <= 0) return 0;
  return clamp01(correct / total);
}

/**
 * SSOT v1 weights:
 * CTW 0.30, DAILY 0.20, ACADEMIC 0.50
 */
export function computeModuleWeightedScore(correct: ModuleCorrect, counts: ModuleCounts): number {
  const ctw = pct(correct.ctwCorrect, counts.ctwTotal);
  const daily = pct(correct.dailyCorrect, counts.dailyTotal);
  const academic = pct(correct.academicCorrect, counts.academicTotal);

  return clamp01(ctw * 0.3 + daily * 0.2 + academic * 0.5);
}

/**
 * Routing thresholds:
 * M1 >= 0.75 => HIGHER else LOWER
 * (You can add borderline later; SSOT v1 keeps it crisp)
 */
export function routeFromM1(m1: number): Branch {
  return m1 >= 0.75 ? "HIGHER" : "LOWER";
}

/**
 * Higher bonus: +0.02 per hard-correct, cap +0.06
 */
export function computeHigherBonus(meta: HigherHardMeta | null | undefined): number {
  const n = Math.max(0, Math.min(3, Math.floor(meta?.hardCorrectCount ?? 0)));
  return n * 0.02;
}

/**
 * Final theta:
 * theta = M1*0.4 + (M2_adj)*0.6
 * scaled = round(theta*30)
 * caps: LOWER <= 23, HIGHER <= 30
 */
export function computeFinalScore(params: {
  m1Correct: ModuleCorrect;
  m1Counts: ModuleCounts;
  m2Correct: ModuleCorrect;
  m2Counts: ModuleCounts;
  routeOverride?: Branch;
  higherHardMeta?: HigherHardMeta;
}): ScoreResult {
  const m1 = computeModuleWeightedScore(params.m1Correct, params.m1Counts);
  const route = params.routeOverride ?? routeFromM1(m1);

  const m2 = computeModuleWeightedScore(params.m2Correct, params.m2Counts);
  const m2Bonus = route === "HIGHER" ? computeHigherBonus(params.higherHardMeta) : 0;

  const m2Adj = clamp01(m2 + m2Bonus);
  const theta = clamp01(m1 * 0.4 + m2Adj * 0.6);

  let scaled = Math.round(theta * 30);

  if (route === "LOWER") scaled = Math.min(scaled, 23);
  else scaled = Math.min(scaled, 30);

  return { m1, route, m2, m2Bonus, theta, scaled };
}