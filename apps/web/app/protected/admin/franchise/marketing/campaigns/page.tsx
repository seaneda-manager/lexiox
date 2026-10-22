import { getServiceSupabase } from "@/lib/supabase/service";
import { ensureHqOrg } from "@/lib/promo/context";
import type { Campaign } from "@/lib/promo/types";
import { HqNav } from "../_nav";
import { CampaignsClient } from "./CampaignsClient";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const svc = getServiceSupabase();
  const hq = await ensureHqOrg(svc);
  const [{ data }, { data: used }] = await Promise.all([
    svc.from("promo_campaigns").select("*").eq("hq_org_id", hq.id).order("created_at", { ascending: false }),
    svc.from("promo_posts").select("campaign_id, org_id, status").not("campaign_id", "is", null),
  ]);
  const usage: Record<string, { branches: number; posted: number }> = {};
  for (const u of used ?? []) {
    const k = u.campaign_id as string;
    usage[k] ??= { branches: 0, posted: 0 };
    if (u.status === "posted") usage[k].posted++;
  }
  for (const k of Object.keys(usage)) {
    usage[k].branches = new Set((used ?? []).filter((u) => u.campaign_id === k).map((u) => u.org_id)).size;
  }
  return (
    <div className="space-y-6">
      <HqNav active="/admin/franchise/marketing/campaigns" />
      <CampaignsClient campaigns={(data ?? []) as Campaign[]} usage={usage} />
    </div>
  );
}
