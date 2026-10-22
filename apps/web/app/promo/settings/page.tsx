import { requirePromoOrg } from "@/lib/promo/context";
import type { OrgProfile } from "@/lib/promo/types";
import { PageHead } from "../_components/ui";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
  const ctx = await requirePromoOrg();
  const { data } = await ctx.supabase.from("promo_org_profiles").select("*").eq("org_id", ctx.org.id).maybeSingle();
  return (
    <>
      <PageHead title="학원 정보" desc="여기 적은 내용이 모든 홍보 문구의 재료가 돼요. 구체적일수록 글이 좋아져요." />
      <SettingsClient profile={(data as OrgProfile) ?? null} orgName={ctx.org.name} />
    </>
  );
}
