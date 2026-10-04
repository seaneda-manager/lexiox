// 출결 안내를 받을 보호자 선택 규칙 (DB 접근 없는 순수 함수).

export type GuardianLite = {
  id: string;
  is_primary: boolean;
  notice_ok: boolean;
};

/**
 * 안내를 받을 보호자를 고른다.
 *  1) 안내 수신(notice_ok)이 꺼진 번호는 제외
 *  2) 주 연락처가 있으면 그 번호, 없으면 목록의 첫 번째
 *  3) 받을 수 있는 번호가 없으면 null (이 경우 초안을 만들지 않고 '연락처 없음'으로 안내)
 */
export function pickGuardian<T extends GuardianLite>(guardians: T[]): T | null {
  const eligible = guardians.filter((g) => g.notice_ok);
  if (eligible.length === 0) return null;
  return eligible.find((g) => g.is_primary) ?? eligible[0];
}

export type AttendanceStatusLite = "present" | "late" | "absent" | "excused";

/**
 * 어떤 출석 상태가 학부모 안내 대상인가: 결석·지각만.
 * 출석은 알릴 필요가 없고, 사유결석은 보통 학부모가 이미 알고 있으므로 기본 대상에서 뺀다.
 */
export function noticeKindForStatus(status: AttendanceStatusLite | null | undefined): "absent" | "late" | null {
  if (status === "absent") return "absent";
  if (status === "late") return "late";
  return null;
}
