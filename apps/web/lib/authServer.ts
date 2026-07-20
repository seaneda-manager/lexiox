// apps/web/lib/authServer.ts

import { getServerSupabase } from '@/lib/supabase/server';

export type UserRole = 'student' | 'teacher' | 'admin';

function normalizeRole(value: unknown): UserRole {
  if (value === 'teacher' || value === 'admin') return value;
  return 'student';
}

/**
 * 🔐 Auth SSOT
 * - user: 인증된 사용자 (서버 검증됨) → 신뢰 기준
 * - session: 로그인 상태/redirect 제어용
 */
export async function getAuthContext() {
  const supabase = await getServerSupabase();

  // ✅ 인증된 사용자 (권장)
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  // ⚙️ 세션 (로그인 여부 체크용)
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const role = normalizeRole(user?.user_metadata?.role);

  return {
    supabase,
    user,
    session,
    role,
    isAuthenticated: !!user && !userError,
  };
}

/**
 * 🔁 레거시 호환 (기존 코드 안 깨지게)
 */
export async function getSessionAndRole() {
  const ctx = await getAuthContext();
  return {
    session: ctx.session,
    role: ctx.role,
    supabase: ctx.supabase,
  };
}
