// apps/web/lib/auth/requireTeacher.ts
"use server";

import { getSupabaseServer } from "@/lib/supabaseServer";

export type Role = "student" | "teacher" | "admin";
export type RoleFlags = {
  isTeacher: boolean;
  isAdmin: boolean;
  /** 콘텐츠 생산 권한 (명시가 없으면 true로 취급) */
  canProduce: boolean;
  userId: string;
};

type ProfileRow = {
  role: Role | null;
  is_admin: boolean | null;
  can_produce: boolean | null;
};

/**
 * teacher 또는 admin만 통과. (admin도 true로 간주)
 * 실패 시 Error throw: "401 unauthorized" | "403 forbidden"
 */
export async function requireTeacherOrAdmin(): Promise<RoleFlags> {
  const supabase = await getSupabaseServer();

  // 1) 로그인 사용자 확인
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) throw new Error("401 unauthorized");
  if (!user) throw new Error("401 unauthorized");

  // 2) 프로필 조회
  const { data, error } = await supabase
    .from("profiles")
    .select("role, is_admin, can_produce")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw new Error("500 profile lookup failed");

  const row = (data ?? null) as ProfileRow | null;
  const isAdmin = !!row?.is_admin || row?.role === "admin";
  const isTeacher = isAdmin || row?.role === "teacher";

  if (!isTeacher) throw new Error("403 forbidden");

  return {
    isTeacher: true,
    isAdmin,
    canProduce: row?.can_produce ?? true,
    userId: user.id,
  };
}

/**
 * teacher만 통과. (admin은 제외하고 싶을 때 사용)
 * 실패 시 Error throw: "401 unauthorized" | "403 forbidden"
 */
export async function requireTeacher(): Promise<RoleFlags> {
  const r = await requireTeacherOrAdmin();
  if (r.isAdmin) {
    // admin은 teacher와 분리하고 싶다면 막는다
    throw new Error("403 forbidden");
  }
  return r;
}
