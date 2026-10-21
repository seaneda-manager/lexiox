import "server-only";
import { getServiceSupabase } from "@/lib/supabase/service";
import type { StudentProgram } from "@/lib/assignments/types";

/**
 * 학생(auth uid)별 저장된 프로그램. profiles.track / has_toefl 은 20261021000001 마이그레이션이 만드는 컬럼이라
 * 아직 실행 전이면 조회가 실패한다 → 그때는 null 을 돌려주고, 호출 쪽은 기존 방식(콘텐츠 기준)으로 대체한다.
 */
export async function getStudentProgramMap(authIds: string[]): Promise<Map<string, StudentProgram> | null> {
  if (authIds.length === 0) return new Map();
  const db = getServiceSupabase();
  const { data, error } = await db.from("profiles").select("id, track, has_toefl").in("id", authIds);
  if (error) return null;
  const map = new Map<string, StudentProgram>();
  for (const p of data ?? []) {
    const track = p.track === "hi_naesin" || p.track === "middle" || p.track === "jr" ? p.track : null;
    map.set(p.id as string, { track, hasToefl: !!p.has_toefl });
  }
  return map;
}
