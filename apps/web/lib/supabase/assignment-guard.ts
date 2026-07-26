// apps/web/lib/supabase/assignment-guard.ts
//
// 예전엔 admin이 수동으로 "Lock" 버튼을 눌러야 시험 수정이 막혔는데, 이 방식은
// is_locked(작성 테이블) / status(미러 테이블) 두 개의 서로 다른 상태를 만들어서
// 복잡도만 늘렸다. 실제로 보호해야 할 건 "이미 학생에게 배정된 시험을 admin이
// 고쳐서 데이터가 꼬이는 것" 하나뿐이므로, test_assignments에 실제 배정이
// 존재하는지로 편집 가능 여부를 자동 판단한다. 별도 Lock 액션이 필요 없다.
//
// Speaking만 예외: test_assignments.speaking_round_id → speaking_rounds.speaking_test_id
// 로 한 단계 더 거쳐야 실제 speaking_tests 행에 도달한다 (speaking_test_id 컬럼은
// speaking_rounds 도입 이전의 레거시라 더 이상 채워지지 않는다).
import { getServiceSupabase } from "./service";

export type AssignableSection = "reading" | "listening" | "speaking" | "writing";

const DIRECT_FK_COLUMN: Record<Exclude<AssignableSection, "speaking">, string> = {
  reading: "reading_test_id",
  listening: "listening_test_id",
  writing: "writing_test_id",
};

async function getAssignedSpeakingTestIds(): Promise<Set<string>> {
  const service = getServiceSupabase();
  const { data: assignments } = await service
    .from("test_assignments")
    .select("speaking_round_id")
    .not("speaking_round_id", "is", null);

  const roundIds = Array.from(
    new Set((assignments ?? []).map((r: any) => r.speaking_round_id).filter(Boolean))
  );
  if (roundIds.length === 0) return new Set();

  const { data: rounds } = await service
    .from("speaking_rounds")
    .select("speaking_test_id")
    .in("id", roundIds);

  return new Set((rounds ?? []).map((r: any) => r.speaking_test_id).filter(Boolean));
}

export async function isTestAssigned(section: AssignableSection, testId: string): Promise<boolean> {
  if (section === "speaking") {
    const ids = await getAssignedSpeakingTestIds();
    return ids.has(testId);
  }
  const service = getServiceSupabase();
  const { data } = await service
    .from("test_assignments")
    .select("id")
    .eq(DIRECT_FK_COLUMN[section], testId)
    .limit(1);
  return !!data && data.length > 0;
}

/** 목록 화면에서 N+1 쿼리 없이 "배정된 시험" 집합을 한 번에 가져온다. */
export async function getAssignedTestIds(section: AssignableSection): Promise<Set<string>> {
  if (section === "speaking") {
    return getAssignedSpeakingTestIds();
  }
  const service = getServiceSupabase();
  const column = DIRECT_FK_COLUMN[section];
  const { data } = await service.from("test_assignments").select(column);
  const ids = new Set<string>();
  for (const row of data ?? []) {
    const v = (row as any)[column];
    if (v) ids.add(v);
  }
  return ids;
}
