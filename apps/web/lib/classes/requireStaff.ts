import { getServerSupabase } from "@/lib/supabase/server";

/**
 * 서버 액션은 URL 로 직접 호출될 수 있어서(레이아웃 가드는 페이지 렌더링만 막는다)
 * 모든 액션이 호출자가 교사/관리자인지 스스로 확인한다.
 * strict 모드가 아닌 프로젝트 설정에서도 좁혀지도록 error 필드로 판별한다.
 */
export async function requireStaff(): Promise<{ userId: string | null; error: string | null }> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { userId: null, error: "로그인이 필요합니다." };
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (me?.role !== "admin" && me?.role !== "teacher") return { userId: null, error: "권한이 없습니다." };
  return { userId: user.id, error: null };
}
