/**
 * Super(admin) 계정의 "역할 미리보기" — 본사/원장/선생님 화면을 로그아웃 없이 전환해서 본다.
 *
 * 화면 구성(메뉴)만 바꾼다. 실제 접근 권한은 계정의 진짜 역할이 결정한다.
 * 진짜 역할이 admin 이 아니면 쿠키가 있어도 무시한다.
 */

import type { AppRole } from "./permissions";

export const VIEW_AS_COOKIE = "lx_view_as";

export type ViewAs = "admin" | "hq_staff" | "franchisee" | "teacher";

export const VIEW_AS_OPTIONS: { value: ViewAs; label: string }[] = [
  { value: "admin", label: "Super" },
  { value: "hq_staff", label: "본사직원" },
  { value: "franchisee", label: "원장" },
  { value: "teacher", label: "선생님" },
];

export function parseViewAs(raw: string | null | undefined): ViewAs | null {
  return raw === "admin" || raw === "hq_staff" || raw === "franchisee" || raw === "teacher" ? raw : null;
}

/** 화면(메뉴)에 적용할 역할. admin 만 전환할 수 있다. */
export function resolveEffectiveRole(actual: AppRole, viewAs: ViewAs | null): AppRole {
  if (actual !== "admin") return actual;
  return viewAs ?? "admin";
}
