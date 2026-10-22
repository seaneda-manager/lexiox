import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceSupabase } from "@/lib/supabase/service";
import { addMonths, monthStart, todayKST } from "./dates";
import type { BrandGuide, Campaign, OrgProfile, PromoOrg, Snapshot } from "./types";

export type OrgBundle = {
  org: PromoOrg;
  profile: OrgProfile | null;
  guide: BrandGuide | null;
  snapshot: Snapshot | null;
  prevSnapshot: Snapshot | null;
  campaigns: Campaign[]; // 본사가 배포한 진행 중 캠페인
};

/**
 * 홍보 문구 생성에 필요한 가맹점 정보를 한 번에 읽는다.
 * db는 사용자 세션 클라이언트(RLS) 또는 cron의 service role 클라이언트.
 */
export async function loadOrgBundle(db: SupabaseClient, org: PromoOrg): Promise<OrgBundle> {
  const thisMonth = monthStart(todayKST());
  const prevMonth = addMonths(thisMonth, -1);
  const today = todayKST();

  const [profileRes, snapRes, guideRes, campRes] = await Promise.all([
    db.from("promo_org_profiles").select("*").eq("org_id", org.id).maybeSingle(),
    db
      .from("promo_learning_snapshots")
      .select("*")
      .eq("org_id", org.id)
      .in("period_month", [thisMonth, prevMonth]),
    org.parent_id
      ? db.from("promo_brand_guides").select("*").eq("hq_org_id", org.parent_id).maybeSingle()
      : Promise.resolve({ data: null }),
    org.parent_id
      ? db
          .from("promo_campaigns")
          .select("*")
          .eq("hq_org_id", org.parent_id)
          .eq("status", "published")
          .or(`ends_on.is.null,ends_on.gte.${today}`)
          .order("starts_on", { ascending: true })
      : Promise.resolve({ data: [] }),
  ]);

  const snaps = (snapRes.data ?? []) as Snapshot[];
  return {
    org,
    profile: (profileRes.data as OrgProfile) ?? null,
    guide: (guideRes.data as BrandGuide) ?? null,
    snapshot: snaps.find((s) => s.period_month === thisMonth) ?? null,
    prevSnapshot: snaps.find((s) => s.period_month === prevMonth) ?? null,
    campaigns: (campRes.data ?? []) as Campaign[],
  };
}

/** 가맹점 org를 id로 읽는다 (service role) */
export async function getOrgById(orgId: string): Promise<PromoOrg | null> {
  const { data } = await getServiceSupabase()
    .from("organizations")
    .select("id, name, kind, parent_id")
    .eq("id", orgId)
    .maybeSingle();
  return (data as PromoOrg) ?? null;
}
