"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ensureHqOrg, requireHqAdmin } from "@/lib/promo/context";
import { refreshOrgSnapshot } from "@/lib/promo/snapshots";
import { monthStart, todayKST } from "@/lib/promo/dates";

export type HqResult = { ok: boolean; error?: string; id?: string; message?: string };

const BASE = "/admin/franchise/marketing";
const ok = (extra: Partial<HqResult> = {}): HqResult => {
  revalidatePath(BASE, "layout");
  return { ok: true, ...extra };
};
const fail = (e: unknown): HqResult => ({
  ok: false,
  error: e instanceof z.ZodError ? "입력값을 확인해주세요." : e instanceof Error ? e.message : "처리하지 못했어요.",
});
const lines = (v: string) =>
  v
    .split(/\n|,/)
    .map((x) => x.trim())
    .filter(Boolean);

// ── 가맹점
export async function createBranch(name: string): Promise<HqResult> {
  try {
    const { svc } = await requireHqAdmin();
    const n = z.string().trim().min(1).max(80).parse(name);
    const hq = await ensureHqOrg(svc);
    const { data, error } = await svc.from("organizations").insert({ name: n, kind: "branch", parent_id: hq.id }).select("id").single();
    if (error) throw new Error(error.message);
    return ok({ id: data.id });
  } catch (e) {
    return fail(e);
  }
}

export async function renameBranch(orgId: string, name: string): Promise<HqResult> {
  try {
    const { svc } = await requireHqAdmin();
    const { error } = await svc.from("organizations").update({ name: z.string().trim().min(1).max(80).parse(name) }).eq("id", orgId).eq("kind", "branch");
    if (error) throw new Error(error.message);
    return ok();
  } catch (e) {
    return fail(e);
  }
}

/** 이메일로 가맹점 원장(owner)·실장(manager) 계정을 연결 */
export async function addBranchMember(orgId: string, email: string, role: "owner" | "manager"): Promise<HqResult> {
  try {
    const { svc } = await requireHqAdmin();
    const e = z.string().trim().email().parse(email).toLowerCase();
    const { data: prof } = await svc.from("profiles").select("id").ilike("email", e).maybeSingle();
    if (!prof) throw new Error("이 이메일로 가입한 계정이 없어요. 먼저 Lexiox에 가입해달라고 요청해주세요.");
    const { data: existing } = await svc.from("memberships").select("role").eq("org_id", orgId).eq("user_id", prof.id).maybeSingle();
    const { error } = existing
      ? await svc.from("memberships").update({ role }).eq("org_id", orgId).eq("user_id", prof.id)
      : await svc.from("memberships").insert({ org_id: orgId, user_id: prof.id, role });
    if (error) throw new Error(error.message);
    return ok();
  } catch (e) {
    return fail(e);
  }
}

export async function removeBranchMember(orgId: string, userId: string): Promise<HqResult> {
  try {
    const { svc } = await requireHqAdmin();
    const { error } = await svc.from("memberships").delete().eq("org_id", orgId).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return ok();
  } catch (e) {
    return fail(e);
  }
}

/** 학생을 가맹점에 배정 (학습 통계 집계 기준) */
export async function assignStudents(orgId: string | null, studentIds: string[]): Promise<HqResult> {
  try {
    const { svc } = await requireHqAdmin();
    const ids = z.array(z.string().uuid()).min(1).max(500).parse(studentIds);
    const { error } = await svc.from("academy_students").update({ org_id: orgId }).in("id", ids);
    if (error) throw new Error(error.message);
    return ok({ message: `${ids.length}명을 ${orgId ? "배정" : "배정 해제"}했어요.` });
  } catch (e) {
    return fail(e);
  }
}

export async function refreshSnapshotNow(orgId: string): Promise<HqResult> {
  try {
    const { svc } = await requireHqAdmin();
    const m = await refreshOrgSnapshot(svc, orgId, monthStart(todayKST()));
    return ok({ message: `재원생 ${m.students.active}명 기준으로 이번 달 통계를 갱신했어요.` });
  } catch (e) {
    return fail(e);
  }
}

// ── 브랜드 가이드
const GuideIn = z.object({
  brand_name: z.string().max(80),
  tone: z.string().max(300),
  must_include: z.string().max(2000),
  must_avoid: z.string().max(2000),
  default_hashtags: z.string().max(1000),
  footer: z.string().max(500),
});
export async function saveBrandGuide(input: z.input<typeof GuideIn>): Promise<HqResult> {
  try {
    const { supabase, svc } = await requireHqAdmin();
    const v = GuideIn.parse(input);
    const hq = await ensureHqOrg(svc);
    const { error } = await supabase.from("promo_brand_guides").upsert({
      hq_org_id: hq.id,
      brand_name: v.brand_name.trim() || null,
      tone: v.tone.trim() || null,
      must_include: lines(v.must_include),
      must_avoid: lines(v.must_avoid),
      default_hashtags: v.default_hashtags.split(/\s+/).filter(Boolean),
      footer: v.footer.trim() || null,
    });
    if (error) throw new Error(error.message);
    return ok();
  } catch (e) {
    return fail(e);
  }
}

// ── 캠페인
const CampaignIn = z.object({
  id: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(1).max(120),
  summary: z.string().max(500),
  starts_on: z.string().optional().nullable(),
  ends_on: z.string().optional().nullable(),
  channel_kinds: z.array(z.string()).max(10),
  brief: z.string().max(4000),
  template_title: z.string().max(300),
  template_body: z.string().max(10000),
  status: z.enum(["draft", "published", "archived"]),
});
export async function saveCampaign(input: z.input<typeof CampaignIn>): Promise<HqResult> {
  try {
    const { supabase, svc, userId } = await requireHqAdmin();
    const { id, ...v } = CampaignIn.parse(input);
    const hq = await ensureHqOrg(svc);
    const d = (x?: string | null) => (x && /^\d{4}-\d{2}-\d{2}$/.test(x) ? x : null);
    const row = {
      ...v,
      starts_on: d(v.starts_on),
      ends_on: d(v.ends_on),
      summary: v.summary.trim() || null,
      brief: v.brief.trim() || null,
      template_title: v.template_title.trim() || null,
      template_body: v.template_body.trim() || null,
    };
    if (id) {
      const { error } = await supabase.from("promo_campaigns").update(row).eq("id", id);
      if (error) throw new Error(error.message);
      return ok({ id });
    }
    const { data, error } = await supabase
      .from("promo_campaigns")
      .insert({ ...row, hq_org_id: hq.id, created_by: userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return ok({ id: data.id });
  } catch (e) {
    return fail(e);
  }
}

export async function deleteCampaign(id: string): Promise<HqResult> {
  try {
    const { supabase } = await requireHqAdmin();
    const { error } = await supabase.from("promo_campaigns").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return ok();
  } catch (e) {
    return fail(e);
  }
}
