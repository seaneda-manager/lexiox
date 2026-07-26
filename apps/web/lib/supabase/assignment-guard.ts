// apps/web/lib/supabase/assignment-guard.ts
//
// 예전엔 admin이 수동으로 "Lock" 버튼을 눌러야 시험 수정이 막혔는데, 이 방식은
// is_locked(작성 테이블) / status(미러 테이블) 두 개의 서로 다른 상태를 만들어서
// 복잡도만 늘렸다. 실제로 보호해야 할 건 "이미 학생에게 배정된 시험을 admin이
// 고쳐서 데이터가 꼬이는 것" 하나뿐이므로, test_assignments에 실제 배정이
// 존재하는지로 편집 가능 여부를 자동 판단한다. 별도 Lock 액션이 필요 없다.
import { getServiceSupabase } from "./service";

export type AssignableSection = "reading" | "listening" | "speaking" | "writing";

const FK_COLUMN: Record<AssignableSection, string> = {
  reading: "reading_test_id",
  listening: "listening_test_id",
  speaking: "speaking_test_id",
  writing: "writing_test_id",
};

export async function isTestAssigned(section: AssignableSection, testId: string): Promise<boolean> {
  const service = getServiceSupabase();
  const { data, error } = await service
    .from("test_assignments")
    .select("id")
    .eq(FK_COLUMN[section], testId)
    .limit(1);
  if (error) throw error;
  return !!data && data.length > 0;
}

/** 목록 화면에서 N+1 쿼리 없이 "배정된 시험" 집합을 한 번에 가져온다. */
export async function getAssignedTestIds(section: AssignableSection): Promise<Set<string>> {
  const service = getServiceSupabase();
  const column = FK_COLUMN[section];
  const { data, error } = await service.from("test_assignments").select(column);
  if (error) throw error;

  const ids = new Set<string>();
  for (const row of data ?? []) {
    const v = (row as any)[column];
    if (v) ids.add(v);
  }
  return ids;
}
