"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getPromoContext, PROMO_ORG_COOKIE, requirePromoOrg } from "@/lib/promo/context";
import { CHANNEL_KIND_LIST, type ChannelKind } from "@/lib/promo/constants";

export type ActionResult = { ok: boolean; id?: string; error?: string };

const done = (id?: string): ActionResult => {
  revalidatePath("/promo", "layout");
  return { ok: true, id };
};
const fail = (e: unknown): ActionResult => ({
  ok: false,
  error: e instanceof z.ZodError ? "입력값을 확인해주세요." : e instanceof Error ? e.message : "저장하지 못했어요.",
});
const opt = z
  .string()
  .max(4000)
  .optional()
  .nullable()
  .transform((v) => (v && v.trim() ? v.trim() : null));
const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const optYmd = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null));
const uuidOrNull = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v && /^[0-9a-f-]{36}$/i.test(v) ? v : null));

// ── 가맹점 선택 (여러 가맹점을 운영하거나 본사가 볼 때)
export async function selectOrg(orgId: string): Promise<ActionResult> {
  const ctx = await getPromoContext();
  if (!ctx || !ctx.orgs.some((o) => o.id === orgId)) return { ok: false, error: "선택할 수 없는 가맹점이에요." };
  const jar = await cookies();
  jar.set(PROMO_ORG_COOKIE, orgId, { path: "/promo", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  return done();
}

// ── 학원 정보
const ProfileIn = z.object({
  display_name: opt,
  region: opt,
  grades: opt,
  subjects: opt,
  strengths: opt,
  classes: opt,
  phone: opt,
  tone: opt,
  avoid: opt,
  trend_keywords: z.array(z.string().trim().max(40)).max(5).optional(),
  auto_approve: z.boolean().optional(),
});
export async function saveProfile(input: z.input<typeof ProfileIn>): Promise<ActionResult> {
  try {
    const ctx = await requirePromoOrg();
    const v = ProfileIn.parse(input);
    const { error } = await ctx.supabase.from("promo_org_profiles").upsert({ org_id: ctx.org.id, ...v });
    if (error) throw new Error(error.message);
    return done();
  } catch (e) {
    return fail(e);
  }
}

// ── 채널
const ChannelIn = z.object({
  id: uuidOrNull,
  kind: z.enum(CHANNEL_KIND_LIST as [ChannelKind, ...ChannelKind[]]),
  name: z.string().trim().min(1).max(60),
  handle: opt,
  write_url: opt.refine((v) => v === null || v.startsWith("https://"), "주소는 https:// 로 시작해야 해요."),
  active: z.boolean(),
});
export async function saveChannel(input: z.input<typeof ChannelIn>): Promise<ActionResult> {
  try {
    const ctx = await requirePromoOrg();
    const { id, ...v } = ChannelIn.parse(input);
    if (id) {
      const { error } = await ctx.supabase.from("promo_channels").update(v).eq("id", id).eq("org_id", ctx.org.id);
      if (error) throw new Error(error.message);
      return done(id);
    }
    const { count } = await ctx.supabase
      .from("promo_channels")
      .select("id", { count: "exact", head: true })
      .eq("org_id", ctx.org.id);
    const { data, error } = await ctx.supabase
      .from("promo_channels")
      .insert({ ...v, org_id: ctx.org.id, color_idx: count ?? 0 })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return done(data.id);
  } catch (e) {
    return fail(e);
  }
}

/** 채널을 연결된 외부 계정(페이지·인스타 계정·지점·유튜브 채널)에 묶는다 */
export async function setChannelTarget(channelId: string, targetId: string | null): Promise<ActionResult> {
  try {
    const ctx = await requirePromoOrg();
    const { data: ch } = await ctx.supabase.from("promo_channels").select("kind").eq("id", channelId).eq("org_id", ctx.org.id).maybeSingle();
    if (!ch) throw new Error("채널을 찾을 수 없어요.");
    if (!targetId) {
      const { error } = await ctx.supabase.from("promo_channels").update({ connection_id: null, target: null }).eq("id", channelId);
      if (error) throw new Error(error.message);
      return done(channelId);
    }
    const provider = ch.kind === "insta" || ch.kind === "facebook" ? "meta" : "google";
    const { data: conn } = await ctx.supabase
      .from("promo_connections")
      .select("id, meta")
      .eq("org_id", ctx.org.id)
      .eq("provider", provider)
      .maybeSingle();
    const targets = ((conn?.meta as { targets?: { id: string; name: string; type: string }[] })?.targets ?? []);
    const t = targets.find((x) => x.id === targetId);
    if (!conn || !t) throw new Error("연결된 계정에서 찾을 수 없어요. 다시 연결해주세요.");
    const { error } = await ctx.supabase.from("promo_channels").update({ connection_id: conn.id, target: t }).eq("id", channelId);
    if (error) throw new Error(error.message);
    return done(channelId);
  } catch (e) {
    return fail(e);
  }
}

export async function disconnectProvider(provider: "meta" | "google"): Promise<ActionResult> {
  try {
    const ctx = await requirePromoOrg();
    const { error } = await ctx.supabase.from("promo_connections").delete().eq("org_id", ctx.org.id).eq("provider", provider);
    if (error) throw new Error(error.message);
    return done();
  } catch (e) {
    return fail(e);
  }
}

export async function deleteChannel(id: string): Promise<ActionResult> {
  try {
    const ctx = await requirePromoOrg();
    const { error } = await ctx.supabase.from("promo_channels").delete().eq("id", id).eq("org_id", ctx.org.id);
    if (error) throw new Error(error.message);
    return done();
  } catch (e) {
    return fail(e);
  }
}

// ── 자동 일정
const AutoIn = z.object({
  id: uuidOrNull,
  channel_id: z.string().uuid(),
  weekdays: z.array(z.number().int().min(0).max(6)).min(1, "요일을 하나 이상 골라주세요."),
  post_time: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v && /^\d{2}:\d{2}/.test(v) ? v : null)),
  topics: z.array(z.string().trim().max(200)).max(30),
  active: z.boolean(),
});
export async function saveAutomation(input: z.input<typeof AutoIn>): Promise<ActionResult> {
  try {
    const ctx = await requirePromoOrg();
    const { id, ...v } = AutoIn.parse(input);
    const row = { ...v, topics: v.topics.filter(Boolean), weekdays: [...new Set(v.weekdays)].sort() };
    if (id) {
      const { error } = await ctx.supabase.from("promo_automations").update(row).eq("id", id).eq("org_id", ctx.org.id);
      if (error) throw new Error(error.message);
      return done(id);
    }
    const { data, error } = await ctx.supabase
      .from("promo_automations")
      .insert({ ...row, org_id: ctx.org.id })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return done(data.id);
  } catch (e) {
    return fail(e);
  }
}

export async function deleteAutomation(id: string): Promise<ActionResult> {
  try {
    const ctx = await requirePromoOrg();
    const { error } = await ctx.supabase.from("promo_automations").delete().eq("id", id).eq("org_id", ctx.org.id);
    if (error) throw new Error(error.message);
    return done();
  } catch (e) {
    return fail(e);
  }
}

// ── 게시물
const PostIn = z.object({
  id: uuidOrNull,
  channel_id: uuidOrNull,
  title: z.string().max(300),
  body: z.string().max(20000),
  hashtags: z.array(z.string().trim().max(60)).max(40),
  scheduled_on: ymd,
  scheduled_time: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v && /^\d{2}:\d{2}/.test(v) ? v : null)),
  status: z.enum(["pending", "scheduled", "posted", "skipped"]),
  media: z
    .array(z.object({ url: z.string().url(), path: z.string().max(300), type: z.enum(["image", "video"]) }))
    .max(10)
    .optional(),
});
export async function savePost(input: z.input<typeof PostIn>): Promise<ActionResult> {
  try {
    const ctx = await requirePromoOrg();
    const { id, ...v } = PostIn.parse(input);
    const row = {
      ...v,
      hashtags: v.hashtags.filter(Boolean),
      posted_at: v.status === "posted" ? new Date().toISOString() : null,
      ...(v.status === "scheduled" ? { approved_by: ctx.userId, approved_at: new Date().toISOString(), publish_error: null } : {}),
      ...(v.media === undefined ? {} : { media: v.media }),
    };
    if (id) {
      const { error } = await ctx.supabase.from("promo_posts").update(row).eq("id", id).eq("org_id", ctx.org.id);
      if (error) throw new Error(error.message);
      return done(id);
    }
    const { data, error } = await ctx.supabase
      .from("promo_posts")
      .insert({ ...row, org_id: ctx.org.id, source: "manual", created_by: ctx.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return done(data.id);
  } catch (e) {
    return fail(e);
  }
}

/** 컨펌: 대기 중인 게시물을 승인(예약)한다. 자동 업로드 채널은 예약 시간에 올라간다. */
export async function approvePosts(ids: string[]): Promise<ActionResult> {
  try {
    const ctx = await requirePromoOrg();
    const clean = z.array(z.string().uuid()).min(1).max(100).parse(ids);
    const { error } = await ctx.supabase
      .from("promo_posts")
      .update({ status: "scheduled", approved_by: ctx.userId, approved_at: new Date().toISOString() })
      .in("id", clean)
      .eq("org_id", ctx.org.id)
      .eq("status", "pending");
    if (error) throw new Error(error.message);
    return done();
  } catch (e) {
    return fail(e);
  }
}

export async function setPostStatus(id: string, status: "scheduled" | "posted" | "skipped"): Promise<ActionResult> {
  try {
    const ctx = await requirePromoOrg();
    const { error } = await ctx.supabase
      .from("promo_posts")
      .update({ status, posted_at: status === "posted" ? new Date().toISOString() : null })
      .eq("id", id)
      .eq("org_id", ctx.org.id);
    if (error) throw new Error(error.message);
    return done(id);
  } catch (e) {
    return fail(e);
  }
}

export async function deletePost(id: string): Promise<ActionResult> {
  try {
    const ctx = await requirePromoOrg();
    const { error } = await ctx.supabase.from("promo_posts").delete().eq("id", id).eq("org_id", ctx.org.id);
    if (error) throw new Error(error.message);
    return done();
  } catch (e) {
    return fail(e);
  }
}

// ── 상담·문의
const LeadIn = z.object({
  id: uuidOrNull,
  student_name: z.string().trim().min(1, "학생 이름을 입력해주세요.").max(60),
  grade: opt,
  school: opt,
  parent_name: opt,
  parent_phone: opt,
  source_channel_id: uuidOrNull,
  source_label: opt,
  stage: z.enum(["inquiry", "booked", "consulted", "enrolled", "on_hold"]),
  inquired_on: ymd,
  next_contact_on: optYmd,
  memo: opt,
});
export async function saveLead(input: z.input<typeof LeadIn>): Promise<ActionResult> {
  try {
    const ctx = await requirePromoOrg();
    const { id, ...v } = LeadIn.parse(input);
    let enrolled_on: string | null | undefined = undefined;
    if (id) {
      const { data: prev } = await ctx.supabase.from("promo_leads").select("stage, enrolled_on").eq("id", id).maybeSingle();
      if (v.stage === "enrolled" && prev?.stage !== "enrolled") enrolled_on = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
      if (v.stage !== "enrolled") enrolled_on = null;
      const { error } = await ctx.supabase
        .from("promo_leads")
        .update({ ...v, ...(enrolled_on !== undefined ? { enrolled_on } : {}) })
        .eq("id", id)
        .eq("org_id", ctx.org.id);
      if (error) throw new Error(error.message);
      return done(id);
    }
    if (v.stage === "enrolled") enrolled_on = v.inquired_on;
    const { data, error } = await ctx.supabase
      .from("promo_leads")
      .insert({ ...v, enrolled_on: enrolled_on ?? null, org_id: ctx.org.id, created_by: ctx.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return done(data.id);
  } catch (e) {
    return fail(e);
  }
}

export async function deleteLead(id: string): Promise<ActionResult> {
  try {
    const ctx = await requirePromoOrg();
    const { error } = await ctx.supabase.from("promo_leads").delete().eq("id", id).eq("org_id", ctx.org.id);
    if (error) throw new Error(error.message);
    return done();
  } catch (e) {
    return fail(e);
  }
}
