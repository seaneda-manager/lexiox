import "server-only";
import { getServiceSupabase } from "@/lib/supabase/service";

/**
 * LEXiOX 학생이 grammar-2026(개념 챕터)을 열 수 있는지.
 * 활성 문법 플랜(student_grammar_plans)이 있으면 true → 선생님이 배정한 챕터를 볼 수 있다.
 * 없으면 기존대로 /jr 로 보낸다. 조회 실패 시에도 false(기존 동작 유지).
 */
export async function lexioxHasGrammarPlan(studentId: string): Promise<boolean> {
  try {
    const { data } = await getServiceSupabase()
      .from("student_grammar_plans")
      .select("id")
      .eq("student_id", studentId)
      .eq("is_enabled", true)
      .limit(1);
    return (data?.length ?? 0) > 0;
  } catch {
    return false;
  }
}
