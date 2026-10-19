import { MAX_HINT_LEVEL } from "./scoring";

export type ResolvedTestConfig = {
  coverage_ratio: number;
  arrangement: "grouped" | "random";
  hints_enabled: boolean;
  max_hint_level: number;
  /** 통과 기준 점수 (정답률 %). 기본 80, 학생별 override 가능 */
  pass_score: number;
  /** 문항당 허용 시간(초). 제한시간 = min(문항 수 * 이 값, max_total_minutes) */
  seconds_per_question: number;
  max_total_minutes: number;
  enable_listen_spell: boolean;
  /** 학습 완료 확인 스킵은 global 설정만 따른다 (학생 row의 기본값 false가 덮어쓰지 않도록) */
  skip_learning_check: boolean;
};

export const DEFAULT_TEST_CONFIG: ResolvedTestConfig = {
  coverage_ratio: 100,
  arrangement: "random",
  hints_enabled: true,
  max_hint_level: MAX_HINT_LEVEL,
  pass_score: 80,
  seconds_per_question: 6,
  max_total_minutes: 15,
  enable_listen_spell: false,
  skip_learning_check: false,
};

const OVERRIDABLE_KEYS = [
  "coverage_ratio",
  "arrangement",
  "hints_enabled",
  "max_hint_level",
  "pass_score",
  "seconds_per_question",
  "max_total_minutes",
  "enable_listen_spell",
] as const;

function pickDefined(row: Record<string, any> | null | undefined): Partial<ResolvedTestConfig> {
  if (!row) return {};
  const out: Record<string, any> = {};
  for (const key of OVERRIDABLE_KEYS) {
    if (row[key] !== null && row[key] !== undefined) out[key] = row[key];
  }
  return out as Partial<ResolvedTestConfig>;
}

/**
 * 시험 설정 해석: 코드 기본값 < global row < student row.
 * vocab_test_configs.scope_id(student)는 auth uid / academy_students.id 어느 쪽으로 저장돼 있어도
 * 찾을 수 있도록 후보 id를 모두 넘긴다.
 */
export async function resolveTestConfig(
  admin: any,
  studentIdCandidates: string[]
): Promise<ResolvedTestConfig> {
  const { data: globalRows } = await admin
    .from("vocab_test_configs")
    .select("*")
    .eq("scope", "global")
    .order("updated_at", { ascending: false })
    .limit(1);
  const globalRow = globalRows?.[0] ?? null;

  const ids = Array.from(new Set(studentIdCandidates.filter(Boolean)));
  let studentRow: Record<string, any> | null = null;
  if (ids.length > 0) {
    const { data: studentRows } = await admin
      .from("vocab_test_configs")
      .select("*")
      .eq("scope", "student")
      .in("scope_id", ids)
      .order("updated_at", { ascending: false })
      .limit(1);
    studentRow = studentRows?.[0] ?? null;
  }

  return {
    ...DEFAULT_TEST_CONFIG,
    ...pickDefined(globalRow),
    ...pickDefined(studentRow),
    skip_learning_check: globalRow?.skip_learning_check ?? DEFAULT_TEST_CONFIG.skip_learning_check,
  };
}

/** 세션 제한시간(초): 문항 수 기준이되 전체 상한(max_total_minutes)을 넘지 않는다. 최소 60초. */
export function computeTimeLimitSeconds(questionCount: number, cfg: ResolvedTestConfig): number {
  const byQuestions = questionCount * cfg.seconds_per_question;
  const cap = cfg.max_total_minutes * 60;
  return Math.max(60, Math.min(byQuestions, cap));
}

/** 네트워크 지연을 감안한 유예(ms) */
export const DEADLINE_GRACE_MS = 3000;

export function isSessionExpired(
  session: { deadline_at?: string | null },
  nowMs: number = Date.now()
): boolean {
  if (!session.deadline_at) return false;
  return nowMs > new Date(session.deadline_at).getTime() + DEADLINE_GRACE_MS;
}

export function remainingSeconds(
  session: { deadline_at?: string | null },
  nowMs: number = Date.now()
): number | null {
  if (!session.deadline_at) return null;
  return Math.max(0, Math.floor((new Date(session.deadline_at).getTime() - nowMs) / 1000));
}
