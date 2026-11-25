/**
 * 단어 시험 설정 읽기 — 우선순위: 학생별 > 반별 > 전역.
 * (start API 와 review-summary API 가 같은 규칙을 쓰도록 한 곳에 둔다)
 */

export const DEFAULT_TOTAL_EXAM_INTERVAL_DAYS = 30;

export type VocabTestConfig = {
  coverage_ratio: number;
  arrangement: string;
  /** 출제 단어 수(관리자/선생님 지정). null = 자동(약점 단어 위주) */
  max_words: number | null;
  /** 총 시험 간격(일). 설정이 없으면 30일 */
  total_exam_interval_days: number;
  /**
   * 학습(깜지까지) 완료 없이도 시험을 볼 수 있게 할지 ("시험만" 학생/반).
   * 컬럼이 NOT NULL default false 라서 "비어 있으면 상위 설정을 따름"이 불가능하다.
   * 그래서 전역·반·학생 중 하나라도 true 면 면제한다(OR). 반/학생에서 끄는 것으로는 전역 면제를 취소하지 못한다.
   */
  skip_learning_check: boolean;
};

export async function getTestConfig(
  admin: any,
  userId: string,
  classId: string | null,
): Promise<VocabTestConfig> {
  // select("*") — 새 컬럼이 아직 없는 DB에서도 깨지지 않게 (없으면 undefined → 기본값)
  const pick = async (scope: string, scopeId: string | null) => {
    try {
      let q = admin.from("vocab_test_configs").select("*").eq("scope", scope);
      q = scopeId ? q.eq("scope_id", scopeId) : q.is("scope_id", null);
      const { data } = await q.limit(1).maybeSingle();
      return (data as any) ?? null;
    } catch {
      return null;
    }
  };

  const global_config = await pick("global", null);
  const class_config = classId ? await pick("class", classId) : null;
  const student_config = await pick("student", userId);

  let coverage_ratio = global_config?.coverage_ratio ?? 70;
  let arrangement = global_config?.arrangement ?? "grouped";
  let max_words: number | null = global_config?.max_words ?? null;
  let interval: number | null = global_config?.total_exam_interval_days ?? null;
  let skip_learning_check = global_config?.skip_learning_check === true;

  for (const c of [class_config, student_config]) {
    if (!c) continue;
    coverage_ratio = c.coverage_ratio ?? coverage_ratio;
    arrangement = c.arrangement ?? arrangement;
    // 비어 있음(null)은 "상위 설정을 따름"이므로 값이 있을 때만 덮어쓴다
    if (c.max_words != null) max_words = c.max_words;
    if (c.total_exam_interval_days != null) interval = c.total_exam_interval_days;
    if (c.skip_learning_check === true) skip_learning_check = true;
  }

  return {
    coverage_ratio,
    arrangement,
    max_words: max_words != null ? Number(max_words) : null,
    total_exam_interval_days: interval != null ? Number(interval) : DEFAULT_TOTAL_EXAM_INTERVAL_DAYS,
    skip_learning_check,
  };
}
