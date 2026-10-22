import { getServiceSupabase } from "@/lib/supabase/service";
import { ensureHqOrg } from "@/lib/promo/context";
import type { BrandGuide } from "@/lib/promo/types";
import { HqNav } from "../_nav";
import { BrandClient } from "./BrandClient";

export const dynamic = "force-dynamic";

export default async function BrandPage() {
  const svc = getServiceSupabase();
  const hq = await ensureHqOrg(svc);
  const { data } = await svc.from("promo_brand_guides").select("*").eq("hq_org_id", hq.id).maybeSingle();
  return (
    <div className="space-y-6">
      <HqNav active="/admin/franchise/marketing/brand" />
      <BrandClient guide={(data as BrandGuide) ?? null} />
    </div>
  );
}
