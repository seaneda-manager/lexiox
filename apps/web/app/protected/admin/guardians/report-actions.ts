// apps/web/app/protected/admin/guardians/report-actions.ts
"use server";

import { headers } from "next/headers";
import { getServiceRoleClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/classes/requireStaff";
import { computeExpiry, generateReportToken, hashReportToken, isLinkActive } from "@/lib/parentReport/token";

export type ReportLinkStatus = {
  expires_at: string;
  last_viewed_at: string | null;
  view_count: number;
};

type Result<T = {}> = { ok: boolean; error?: string } & Partial<T>;

/** 요청이 들어온 주소(도메인)로 공개 링크를 만든다. 로컬/미리보기/운영 어디서든 그 환경 주소가 나온다. */
async function publicBaseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host && host.startsWith("localhost") ? "http" : "https");
  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_SUPABASE_SITE_URL || "";
}

/** 학생별 '지금 유효한' 리포트 링크 현황 (만료·폐기된 것은 제외). 토큰 원문은 저장하지 않으므로 URL 은 알 수 없다. */
export async function listReportLinkStatusAction(): Promise<Result<{ links: Record<string, ReportLinkStatus> }>> {
  try {
    const auth = await requireStaff();
    if (auth.error) return { ok: false, error: auth.error };
    const db = getServiceRoleClient();
    const { data, error } = await db
      .from("parent_report_links")
      .select("student_id, expires_at, revoked_at, last_viewed_at, view_count")
      .is("revoked_at", null);
    if (error) throw new Error(error.message);

    const links: Record<string, ReportLinkStatus> = {};
    for (const row of (data ?? []) as any[]) {
      if (!isLinkActive(row)) continue;
      links[row.student_id] = { expires_at: row.expires_at, last_viewed_at: row.last_viewed_at ?? null, view_count: row.view_count ?? 0 };
    }
    return { ok: true, links };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "리포트 링크 조회 실패" };
  }
}

/**
 * 새 리포트 링크 발급. 이전 링크는 즉시 폐기한다(학생당 유효한 링크는 하나).
 * 주소(URL)는 이 응답에서 단 한 번만 돌려준다 — DB 에는 해시만 있어 나중에 다시 볼 수 없다.
 */
export async function createReportLinkAction(params: { studentId: string; days?: number }): Promise<Result<{ url: string; expiresAt: string }>> {
  try {
    const auth = await requireStaff();
    if (auth.error) return { ok: false, error: auth.error };
    const db = getServiceRoleClient();

    const { data: stu } = await db.from("profiles").select("id, role").eq("id", params.studentId).maybeSingle();
    if (!stu || (stu as any).role !== "student") return { ok: false, error: "학생을 찾을 수 없습니다." };

    const now = new Date();
    const off = await db
      .from("parent_report_links")
      .update({ revoked_at: now.toISOString() })
      .eq("student_id", params.studentId)
      .is("revoked_at", null);
    if (off.error) throw new Error(off.error.message);

    const token = generateReportToken();
    const expires = computeExpiry(now, params.days);
    const ins = await db.from("parent_report_links").insert({
      student_id: params.studentId,
      token_hash: hashReportToken(token),
      expires_at: expires.toISOString(),
      created_by: auth.userId,
    });
    if (ins.error) throw new Error(ins.error.message);

    const base = await publicBaseUrl();
    return { ok: true, url: `${base}/p/${token}`, expiresAt: expires.toISOString() };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "링크 발급 실패" };
  }
}

/** 링크 즉시 폐기 (유출·오발송이 의심될 때). */
export async function revokeReportLinkAction(params: { studentId: string }): Promise<Result> {
  try {
    const auth = await requireStaff();
    if (auth.error) return { ok: false, error: auth.error };
    const db = getServiceRoleClient();
    const { error } = await db
      .from("parent_report_links")
      .update({ revoked_at: new Date().toISOString() })
      .eq("student_id", params.studentId)
      .is("revoked_at", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "링크 폐기 실패" };
  }
}
