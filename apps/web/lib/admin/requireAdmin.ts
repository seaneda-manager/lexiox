// apps/web/lib/admin/requireAdmin.ts
//
// /api/* 는 middleware matcher에서 제외되어 있어서(admin 레이아웃의 role 체크도 적용되지 않음)
// 파괴적인 admin API는 라우트 안에서 직접 role을 확인해야 한다.
import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

/** admin이면 null, 아니면 그대로 return 할 수 있는 401/403 응답을 돌려준다. */
export async function requireAdmin(): Promise<NextResponse | null> {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (me?.role !== "admin") {
    return NextResponse.json({ ok: false, error: "관리자 권한이 필요합니다." }, { status: 403 });
  }
  return null;
}
