export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

import { getServiceSupabase } from "@/lib/supabase/service";
import { runTrendPlan } from "@/lib/promo/trends";
import type { PromoOrg } from "@/lib/promo/types";

// 매주 월요일 새벽(KST 05시): 가맹점별 트렌드 분석 → 2주 플랜 → 컨펌 대기 게시물
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const svc = getServiceSupabase();
  try {
    const { data: chans } = await svc.from("promo_channels").select("org_id").eq("active", true);
    const orgIds = [...new Set((chans ?? []).map((c) => c.org_id as string))];
    const { data: orgs } = orgIds.length
      ? await svc.from("organizations").select("id, name, kind, parent_id").in("id", orgIds).eq("kind", "branch")
      : { data: [] };

    const results: { orgId: string; created?: number; error?: string }[] = [];
    for (const org of (orgs ?? []) as PromoOrg[]) {
      try {
        const r = await runTrendPlan(svc, org);
        results.push({ orgId: org.id, created: r.created });
      } catch (e) {
        results.push({ orgId: org.id, error: e instanceof Error ? e.message : String(e) });
      }
    }
    return Response.json({ ok: true, results, timestamp: new Date().toISOString() });
  } catch (e) {
    console.error("promo-weekly cron error:", e);
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
