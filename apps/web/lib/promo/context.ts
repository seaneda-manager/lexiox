import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import type { PromoOrg } from "./types";

export const PROMO_ORG_COOKIE = "promo_org";

export type PromoContext = {
  supabase: Awaited<ReturnType<typeof getServerSupabase>>;
  userId: string;
  isHq: boolean;
  org: PromoOrg | null; // 지금 보고 있는 가맹점
  orgs: PromoOrg[]; // 이 사용자가 운영할 수 있는 가맹점 목록
};

/**
 * 로그인 사용자와 운영 가능한 가맹점을 확인한다.
 * - 가맹점 운영자: memberships.role in (owner, manager) 인 가맹점
 * - 본사 관리자(profiles.role = admin): 모든 가맹점
 * 홍보 테이블 읽기·쓰기는 반환된 supabase(사용자 세션) 클라이언트로 하며 RLS가 다시 확인한다.
 * memberships/organizations 자체의 RLS 설정에 기대지 않도록 소속 조회만 service role로 한다.
 */
export const getPromoContext = cache(async (): Promise<PromoContext | null> => {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const svc = getServiceSupabase();
  const { data: me } = await svc.from("profiles").select("role, is_admin").eq("id", user.id).maybeSingle();
  const isHq = me?.role === "admin" || !!me?.is_admin;

  let orgs: PromoOrg[] = [];
  if (isHq) {
    const { data } = await svc
      .from("organizations")
      .select("id, name, kind, parent_id")
      .eq("kind", "branch")
      .order("name");
    orgs = (data ?? []) as PromoOrg[];
  } else {
    const { data: ms } = await svc
      .from("memberships")
      .select("org_id, role")
      .eq("user_id", user.id)
      .in("role", ["owner", "manager"]);
    const ids = (ms ?? []).map((m) => m.org_id as string);
    if (ids.length) {
      const { data } = await svc
        .from("organizations")
        .select("id, name, kind, parent_id")
        .in("id", ids)
        .order("name");
      orgs = ((data ?? []) as PromoOrg[]).filter((o) => o.kind !== "hq");
    }
  }

  const jar = await cookies();
  const wanted = jar.get(PROMO_ORG_COOKIE)?.value;
  const org = orgs.find((o) => o.id === wanted) ?? orgs[0] ?? null;

  return { supabase, userId: user.id, isHq, org, orgs };
});

/** 서버 액션·API에서 쓰는 버전: 가맹점이 없으면 에러 */
export async function requirePromoOrg(): Promise<PromoContext & { org: PromoOrg }> {
  const ctx = await getPromoContext();
  if (!ctx) throw new Error("로그인이 필요해요.");
  if (!ctx.org) throw new Error("운영 중인 가맹점이 없어요. 본사에 가맹점 연결을 요청해주세요.");
  return ctx as PromoContext & { org: PromoOrg };
}

/** 본사 관리자 확인 (본사 화면 서버 액션용) */
export async function requireHqAdmin() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요해요.");
  const svc = getServiceSupabase();
  const { data: me } = await svc.from("profiles").select("role, is_admin").eq("id", user.id).maybeSingle();
  if (!(me?.role === "admin" || me?.is_admin)) throw new Error("본사 관리자만 할 수 있어요.");
  return { supabase, svc, userId: user.id };
}

/** 본사 org (kind = 'hq')를 찾고 없으면 만든다 */
export async function ensureHqOrg(svc = getServiceSupabase()): Promise<PromoOrg> {
  const { data } = await svc.from("organizations").select("id, name, kind, parent_id").eq("kind", "hq").limit(1);
  if (data && data[0]) return data[0] as PromoOrg;
  const { data: created, error } = await svc
    .from("organizations")
    .insert({ name: "LEXiOX 본사", kind: "hq" })
    .select("id, name, kind, parent_id")
    .single();
  if (error) throw new Error("본사 정보를 만들지 못했어요: " + error.message);
  return created as PromoOrg;
}
