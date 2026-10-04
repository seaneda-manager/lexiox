// 수업 진행 보드의 계산 로직 (DB 접근 없는 순수 함수).

export type AttendanceStatus = "present" | "late" | "absent" | "excused";

export const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = {
  present: "출석",
  late: "지각",
  absent: "결석",
  excused: "사유결석",
};

/** 수업 날짜 기준으로 그 반 소속이었는지. 입반일 포함, 퇴반일은 그날까지 포함(퇴반 당일 수업은 들은 것으로 본다). */
export function isMemberOn(sessionDate: string, joinedOn: string | null, leftOn: string | null): boolean {
  if (joinedOn && sessionDate < joinedOn) return false;
  if (leftOn && sessionDate > leftOn) return false;
  return true;
}

export type AttendanceSummary = {
  total: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
  /** 아직 출석 기록이 없는 학생 수 */
  unchecked: number;
};

export function summarizeAttendance(
  studentIds: string[],
  records: { student_id: string; status: AttendanceStatus }[]
): AttendanceSummary {
  const byStudent = new Map<string, AttendanceStatus>();
  for (const r of records) byStudent.set(r.student_id, r.status);

  const s: AttendanceSummary = { total: studentIds.length, present: 0, late: 0, absent: 0, excused: 0, unchecked: 0 };
  for (const id of studentIds) {
    const st = byStudent.get(id);
    if (!st) s.unchecked += 1;
    else s[st] += 1;
  }
  return s;
}

/** 수업 상태 배지: 출석 기록이 하나도 없으면 '미체크', 일부만 있으면 '일부 체크', 모두 있으면 '체크 완료'. */
export function checkState(summary: AttendanceSummary): "unchecked" | "partial" | "done" {
  if (summary.total === 0) return "done";
  if (summary.unchecked === summary.total) return "unchecked";
  if (summary.unchecked > 0) return "partial";
  return "done";
}

export type StepProgress = Record<string, { done_at: string | null } | undefined>; // step_key -> 진행

/**
 * 하브루타 1:1 대기열: '준비 단계(prepKey)'는 끝냈고 '1:1 단계(oneOnOneKey)'는 아직인 학생을
 * 준비를 먼저 끝낸 순서대로 반환한다. (먼저 준비한 학생부터 호출하기 위함)
 * 출석이 결석/사유결석인 학생은 대기열에서 제외.
 */
export function havrutaQueue(args: {
  studentIds: string[];
  steps: Map<string, StepProgress>; // student_id -> 단계 진행
  attendance: Map<string, AttendanceStatus>;
  prepKey: string;
  oneOnOneKey: string;
}): string[] {
  const { studentIds, steps, attendance, prepKey, oneOnOneKey } = args;
  const ready: { id: string; at: string }[] = [];
  for (const id of studentIds) {
    const st = attendance.get(id);
    if (st === "absent" || st === "excused") continue;
    const p = steps.get(id) ?? {};
    const prep = p[prepKey]?.done_at;
    const one = p[oneOnOneKey]?.done_at;
    if (prep && !one) ready.push({ id, at: prep });
  }
  ready.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : a.id.localeCompare(b.id)));
  return ready.map((r) => r.id);
}

/** 학생 한 명이 흐름 단계를 몇 개 끝냈는지 (진행률 표시용) */
export function stepsDoneCount(progress: StepProgress | undefined, stepKeys: string[]): number {
  if (!progress) return 0;
  return stepKeys.filter((k) => progress[k]?.done_at).length;
}
