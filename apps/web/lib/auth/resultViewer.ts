// 결과(해설) 조회 API 공통 접근 검사.
// 본인 결과만 볼 수 있고, 선생님/관리자는 모두 볼 수 있다. 로그인 안 하면 null.
import { getServerSupabase } from "@/lib/supabase/server";

export type ResultViewer = { userId: string; isStaff: boolean };

export async function getResultViewer(): Promise<ResultViewer | null> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("role, is_admin")
    .eq("id", user.id)
    .maybeSingle();

  const role = (data as { role?: string | null; is_admin?: boolean | null } | null)?.role;
  const isStaff = !!(data as { is_admin?: boolean | null } | null)?.is_admin || role === "admin" || role === "teacher";
  return { userId: user.id, isStaff };
}

/** 학생이면 본인 행으로 범위를 좁히고, 스태프는 그대로 둔다. */
export function scopeToViewer<Q>(q: Q, viewer: ResultViewer): Q {
  // postgrest 빌더의 깊은 제네릭 때문에 any 로 한 번만 우회한다 (반환 타입은 그대로 Q).
  return viewer.isStaff ? q : ((q as any).eq("user_id", viewer.userId) as Q);
}
