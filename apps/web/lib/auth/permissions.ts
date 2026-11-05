/**
 * 권한(capability) 목록과 역할별 기본값.
 *
 * 설계 (2026-11-05):
 *  - 메뉴/기능은 "역할"이 아니라 "권한 키"에 걸린다. 계정이 가진 권한 집합으로 보이는 것을 결정한다.
 *  - admin = Super(전부). franchisee(원장) ⊇ teacher(선생님). hq_staff(본사 직원)는 별도(전체 열람 + 콘텐츠·허브).
 *  - 선생님은 직급별로 권한이 다르고, 직급·권한은 원장이 정한다 → 나중에 DB(직급별 권한)에서 읽어온 집합을
 *    그대로 넣으면 된다. 지금(1단계)은 역할별 기본값만 쓴다.
 */

export type AppRole = "student" | "teacher" | "franchisee" | "hq_staff" | "admin";

export const PERMISSIONS = {
  // ── 선생님 기본 업무 ──
  "today.sessions": "오늘의 수업 보기",
  "attendance.check": "출석 체크·조회",
  "homework.grade": "숙제 채점",
  "students.view": "학생 현황 보기",
  "assign.manage": "숙제·단어·시험 배정",
  "exam.create": "시험 출제",
  "reports.view": "리포트 보기",
  "lesson_log.write": "수업 로그 작성",
  // ── 원장(가맹점 운영) ──
  "students.manage": "학생 추가·수정",
  "guardians.view": "학부모 연락처 보기",
  "classes.manage": "반·시간표 관리",
  "branch.settings": "가맹점 설정(시험 설정 등)",
  "branch.staff": "선생님 직급·권한 관리",
  // ── 본사 ──
  "content.produce": "콘텐츠 제작",
  "branches.view_all": "모든 가맹점 열람",
  "franchise.hq": "본사 허브(가맹점·공지·교육)",
  "system.admin": "시스템 관리(사용자·권한·설정)",
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as PermissionKey[];

/** 선생님 기본(직급 지정 전) 권한 */
export const TEACHER_DEFAULT_PERMISSIONS: PermissionKey[] = [
  "today.sessions",
  "attendance.check",
  "homework.grade",
  "students.view",
  "assign.manage",
  "exam.create",
  "reports.view",
  "lesson_log.write",
];

/** 원장 = 선생님 권한 전부 + 가맹점 운영 권한 (본사·시스템 권한은 없음) */
export const FRANCHISEE_DEFAULT_PERMISSIONS: PermissionKey[] = [
  ...TEACHER_DEFAULT_PERMISSIONS,
  "students.manage",
  "guardians.view",
  "classes.manage",
  "branch.settings",
  "branch.staff",
];

/**
 * 본사 직원 기본 권한: 모든 가맹점을 열람하고 콘텐츠·본사 허브를 다룬다.
 * 사용자·권한 같은 시스템 관리는 Super(admin)만. 직원별 세부 권한은 Super 가 조정한다.
 */
export const HQ_STAFF_DEFAULT_PERMISSIONS: PermissionKey[] = [
  "branches.view_all",
  "students.view",
  "reports.view",
  "content.produce",
  "franchise.hq",
];

export function defaultPermissionsForRole(role: AppRole): PermissionKey[] {
  switch (role) {
    case "admin":
      return [...ALL_PERMISSIONS];
    case "hq_staff":
      return [...HQ_STAFF_DEFAULT_PERMISSIONS];
    case "franchisee":
      return [...FRANCHISEE_DEFAULT_PERMISSIONS];
    case "teacher":
      return [...TEACHER_DEFAULT_PERMISSIONS];
    default:
      return [];
  }
}

/** perm 이 없으면(누구에게나 보이는 메뉴) true */
export function hasPermission(perms: readonly string[], perm?: PermissionKey | null): boolean {
  if (!perm) return true;
  return perms.includes(perm);
}
