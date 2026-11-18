// 본사 관제실용 AI 사용 비용 집계 (ai_usage_logs 기반, 서버 전용).
// 비용은 로그에 기록된 "추정 USD" 합계다. 요금표에 없는 모델은 비용이 null 로 기록돼 합계에서 빠진다.

import type { SupabaseClient } from "@supabase/supabase-js";

export type AiCostSummary = {
  /** 최근 6개월(오래된 달 → 이번 달), 한국 시간 기준 달 */
  months: { key: string; label: string; usd: number }[];
  thisMonthUsd: number;
  /** 이번 달 비용이 큰 route 상위 */
  topRoutes: { route: string; usd: number }[];
  todayUsd: number;
  /** 오늘을 뺀 직전 7일의 하루 평균 */
  avg7Usd: number;
  /** 오늘 비용이 직전 7일 평균의 3배 이상이고 $1 이상이면 true */
  spike: boolean;
};

const PAGE = 1000;
const MAX_PAGES = 40;

function kstKey(iso: string, len: 7 | 10): string {
  return new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, len);
}

export async function loadAiCostSummary(db: SupabaseClient, now = new Date()): Promise<AiCostSummary | null> {
  const since = new Date(now.getTime() - 185 * 24 * 60 * 60 * 1000).toISOString();
  const rows: { created_at: string; route: string; estimated_cost_usd: number | null }[] = [];
  try {
    for (let p = 0; p < MAX_PAGES; p++) {
      const { data, error } = await db
        .from("ai_usage_logs")
        .select("created_at, route, estimated_cost_usd")
        .gte("created_at", since)
        .order("created_at", { ascending: true })
        .range(p * PAGE, p * PAGE + PAGE - 1);
      if (error) return null;
      rows.push(...((data ?? []) as typeof rows));
      if (!data || data.length < PAGE) break;
    }
  } catch {
    return null;
  }

  const thisMonth = kstKey(now.toISOString(), 7);
  const todayKey = kstKey(now.toISOString(), 10);
  const monthKeys: string[] = [];
  const [ty, tm] = thisMonth.split("-").map(Number);
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(ty, tm - 1 - i, 1));
    monthKeys.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }

  const byMonth = new Map<string, number>(monthKeys.map((k) => [k, 0]));
  const byRoute = new Map<string, number>();
  const byDay = new Map<string, number>();
  for (const r of rows) {
    const usd = Number(r.estimated_cost_usd ?? 0);
    if (!usd) continue;
    const mk = kstKey(r.created_at, 7);
    if (byMonth.has(mk)) byMonth.set(mk, (byMonth.get(mk) ?? 0) + usd);
    if (mk === thisMonth) byRoute.set(r.route, (byRoute.get(r.route) ?? 0) + usd);
    const dk = kstKey(r.created_at, 10);
    byDay.set(dk, (byDay.get(dk) ?? 0) + usd);
  }

  let prev7 = 0;
  for (let i = 1; i <= 7; i++) {
    const dk = kstKey(new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString(), 10);
    prev7 += byDay.get(dk) ?? 0;
  }
  const avg7Usd = prev7 / 7;
  const todayUsd = byDay.get(todayKey) ?? 0;

  return {
    months: monthKeys.map((k) => ({ key: k, label: `${Number(k.slice(5))}월`, usd: byMonth.get(k) ?? 0 })),
    thisMonthUsd: byMonth.get(thisMonth) ?? 0,
    topRoutes: [...byRoute.entries()]
      .map(([route, usd]) => ({ route, usd }))
      .sort((a, b) => b.usd - a.usd)
      .slice(0, 5),
    todayUsd,
    avg7Usd,
    spike: todayUsd >= 1 && todayUsd >= avg7Usd * 3,
  };
}
