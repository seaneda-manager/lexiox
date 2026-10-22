import "server-only";
import { requirePromoOrg } from "@/lib/promo/context";
import type { Automation, Channel, Lead, Post } from "@/lib/promo/types";

export async function loadBase() {
  const ctx = await requirePromoOrg();
  const { data: channels } = await ctx.supabase
    .from("promo_channels")
    .select("*")
    .eq("org_id", ctx.org.id)
    .order("created_at");
  return { ctx, channels: (channels ?? []) as Channel[] };
}

export async function loadPosts(orgId: string, db: Awaited<ReturnType<typeof requirePromoOrg>>["supabase"], from: string, to: string) {
  const { data } = await db
    .from("promo_posts")
    .select("*")
    .eq("org_id", orgId)
    .gte("scheduled_on", from)
    .lte("scheduled_on", to)
    .order("scheduled_on")
    .order("scheduled_time", { nullsFirst: true });
  return (data ?? []) as Post[];
}

export async function loadLeads(orgId: string, db: Awaited<ReturnType<typeof requirePromoOrg>>["supabase"]) {
  const { data } = await db.from("promo_leads").select("*").eq("org_id", orgId).order("inquired_on", { ascending: false });
  return (data ?? []) as Lead[];
}

export async function loadAutomations(orgId: string, db: Awaited<ReturnType<typeof requirePromoOrg>>["supabase"]) {
  const { data } = await db.from("promo_automations").select("*").eq("org_id", orgId).order("created_at");
  return (data ?? []) as Automation[];
}
