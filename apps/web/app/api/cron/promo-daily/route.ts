export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

import { getServiceSupabase } from "@/lib/supabase/service";
import { refreshAllSnapshots } from "@/lib/promo/snapshots";
import { autogenForOrg } from "@/lib/promo/autogen";
import type { PromoOrg } from "@/lib/promo/types";

/**
 * 매일 새벽(KST 03시) 실행
 * 1) 가맹점별 학습 통계 스냅샷 갱신
 * 2) 자동 일정이 켜진 가맹점의 다음 7일 콘텐츠 생성
 */
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const svc = getServiceSupabase();
  try {
    const snapshots = await refreshAllSnapshots(svc);

    const { data: autoOrgs } = await svc.from("promo_automations").select("org_id").eq("active", true);
    const orgIds = [...new Set((autoOrgs ?? []).map((a) => a.org_id as string))];
    const { data: orgs } = orgIds.length
      ? await svc.from("organizations").select("id, name, kind, parent_id").in("id", orgIds)
      : { data: [] };

    const autogen: { orgId: string; created?: number; error?: string }[] = [];
    for (const org of (orgs ?? []) as PromoOrg[]) {
      try {
        const r = await autogenForOrg(svc, org);
        autogen.push({ orgId: org.id, created: r.created });
      } catch (e) {
        autogen.push({ orgId: org.id, error: e instanceof Error ? e.message : String(e) });
      }
    }

    return Response.json({
      ok: true,
      snapshots: { total: snapshots.length, failed: snapshots.filter((s) => !s.ok) },
      autogen,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error("promo-daily cron error:", e);
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
