export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

import { NextResponse } from "next/server";
import { requirePromoOrg } from "@/lib/promo/context";
import { PromoLimitError } from "@/lib/promo/ai";
import { runTrendPlan } from "@/lib/promo/trends";

// 트렌드 분석·플랜 '지금 실행'
export async function POST() {
  try {
    const ctx = await requirePromoOrg();
    const r = await runTrendPlan(ctx.supabase, ctx.org, ctx.userId);
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    const status = e instanceof PromoLimitError ? 429 : 500;
    if (status === 500) console.error("[promo/trends]", e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "알 수 없는 오류" }, { status });
  }
}
