import "server-only";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";

export type PlannerStudentContext = {
  authId: string;
  academyId: string;
  schoolId: string | null;
};

/**
 * 현재 로그인한 학생의 planner 컨텍스트를 해석한다.
 * academy_students 행이 없으면 null (planner 는 academy_students.id 를 FK 로 쓴다).
 * academy_students 의 학생↔auth 매핑이 auth_user_id / user_id / profile_id 로
 * 흩어져 있어(레거시) 세 컬럼을 모두 시도한다.
 */
export async function getPlannerStudentContext(): Promise<PlannerStudentContext | null> {
  const authed = await getServerSupabase();
  const {
    data: { user },
  } = await authed.auth.getUser();
  if (!user) return null;

  const db = getServiceSupabase();
  for (const col of ["auth_user_id", "user_id", "profile_id"] as const) {
    const { data } = await db
      .from("academy_students")
      .select("id, school_id")
      .eq(col, user.id)
      .maybeSingle();
    if (data?.id) {
      return {
        authId: user.id,
        academyId: String(data.id),
        schoolId: (data as { school_id: string | null }).school_id ?? null,
      };
    }
  }
  return null;
}
