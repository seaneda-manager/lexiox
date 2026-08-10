import type { SupabaseClient } from "@supabase/supabase-js";
import { summarizeWeaknesses, type CategoryStat } from "./weaknessCategories";

/** 학생 본인의 Hi-내신 드릴 응답을 카테고리별 정답률로 집계한다 (DeepCheck 준비 도구, 관리자 학생 상세 페이지 공용). */
export async function fetchHiNaesinWeaknessStats(
  supabase: SupabaseClient,
  studentAuthId: string,
): Promise<CategoryStat[]> {
  const { data: sessions } = await supabase
    .from("hi_naesin_sessions")
    .select("id")
    .eq("student_id", studentAuthId)
    .eq("session_type", "drill");

  const sessionIds = (sessions ?? []).map((s) => s.id);
  if (sessionIds.length === 0) return [];

  const { data: responses } = await supabase
    .from("hi_naesin_drill_responses")
    .select("drill_id, is_correct")
    .in("session_id", sessionIds);
  if (!responses || responses.length === 0) return [];

  const drillIds = [...new Set(responses.map((r) => r.drill_id).filter(Boolean))];
  const { data: drills } = await supabase
    .from("hi_naesin_drills")
    .select("id, drill_type, payload")
    .in("id", drillIds);
  const drillById = new Map((drills ?? []).map((d) => [d.id, d]));

  const rows = responses.flatMap((r) => {
    const drill = drillById.get(r.drill_id);
    if (!drill) return [];
    return [{ drillType: drill.drill_type, payload: drill.payload, isCorrect: r.is_correct }];
  });

  return summarizeWeaknesses(rows);
}
