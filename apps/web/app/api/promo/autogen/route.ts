export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

import { NextResponse } from "next/server";
import { requirePromoOrg } from "@/lib/promo/context";
import { autogenForOrg } from "@/lib/promo/autogen";
import { PromoLimitError } from "@/lib/promo/ai";

// "지금 생성" 버튼: 다음 7일 자동 콘텐츠를 만든다
export async function POST() {
  try {
    const ctx = await requirePromoOrg();
    const result = await autogenForOrg(ctx.supabase, ctx.org, { createdBy: ctx.userId });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const status = e instanceof PromoLimitError ? 429 : 500;
    if (status === 500) console.error("[promo/autogen]", e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "알 수 없는 오류" }, { status });
  }
}
