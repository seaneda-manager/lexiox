export type ScoreboardPeriod = "daily" | "weekly" | "monthly" | "6month" | "yearly";

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** UTC now → KST 달력 기준 자정(해당 KST 날짜의 00:00)을 UTC Date로 반환 */
function kstMidnight(utcNow: Date, daysBack = 0): Date {
  const kst = new Date(utcNow.getTime() + KST_OFFSET_MS);
  kst.setUTCHours(0, 0, 0, 0);
  kst.setUTCDate(kst.getUTCDate() - daysBack);
  return new Date(kst.getTime() - KST_OFFSET_MS);
}

/**
 * 기간 → [start, end) 범위 (KST 달력 기준 앵커).
 * end는 항상 now.
 */
export function resolvePeriodRange(
  period: ScoreboardPeriod,
  now: Date = new Date()
): { start: Date; end: Date } {
  const end = now;

  if (period === "daily") {
    return { start: kstMidnight(now), end };
  }

  if (period === "weekly") {
    const kst = new Date(now.getTime() + KST_OFFSET_MS);
    const dow = kst.getUTCDay(); // 0=Sun..6=Sat
    const daysSinceMonday = (dow + 6) % 7;
    return { start: kstMidnight(now, daysSinceMonday), end };
  }

  if (period === "monthly") {
    const kst = new Date(now.getTime() + KST_OFFSET_MS);
    const monthStartKst = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), 1));
    return { start: new Date(monthStartKst.getTime() - KST_OFFSET_MS), end };
  }

  if (period === "6month") {
    const kst = new Date(now.getTime() + KST_OFFSET_MS);
    const startKst = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth() - 5, 1));
    return { start: new Date(startKst.getTime() - KST_OFFSET_MS), end };
  }

  // yearly
  const kst = new Date(now.getTime() + KST_OFFSET_MS);
  const yearStartKst = new Date(Date.UTC(kst.getUTCFullYear(), 0, 1));
  return { start: new Date(yearStartKst.getTime() - KST_OFFSET_MS), end };
}
