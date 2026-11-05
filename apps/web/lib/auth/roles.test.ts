import { describe, expect, it } from "vitest";
import {
  ALL_PERMISSIONS,
  FRANCHISEE_DEFAULT_PERMISSIONS,
  HQ_STAFF_DEFAULT_PERMISSIONS,
  TEACHER_DEFAULT_PERMISSIONS,
  defaultPermissionsForRole,
  hasPermission,
} from "./permissions";
import { parseViewAs, resolveEffectiveRole } from "./viewAs";

describe("역할별 기본 권한", () => {
  it("원장은 선생님 권한을 모두 포함한다 (원장 ⊇ 선생님)", () => {
    for (const p of TEACHER_DEFAULT_PERMISSIONS) {
      expect(FRANCHISEE_DEFAULT_PERMISSIONS).toContain(p);
    }
  });

  it("원장에게는 본사·시스템 권한이 없다", () => {
    const f = defaultPermissionsForRole("franchisee");
    expect(f).not.toContain("franchise.hq");
    expect(f).not.toContain("system.admin");
    expect(f).not.toContain("content.produce");
  });

  it("선생님에게는 학생 추가·학부모 연락처·직급 관리 같은 원장 권한이 없다", () => {
    const t = defaultPermissionsForRole("teacher");
    expect(t).not.toContain("students.manage");
    expect(t).not.toContain("guardians.view");
    expect(t).not.toContain("branch.staff");
  });

  it("본사 직원: 전체 열람·콘텐츠·허브는 되고, 시스템 관리·원장 운영 권한은 없다", () => {
    const h = defaultPermissionsForRole("hq_staff");
    expect(h).toEqual(HQ_STAFF_DEFAULT_PERMISSIONS);
    for (const p of ["branches.view_all", "franchise.hq", "content.produce"] as const) expect(h).toContain(p);
    for (const p of ["system.admin", "branch.staff", "students.manage", "guardians.view"] as const) expect(h).not.toContain(p);
  });

  it("admin(Super)은 전부, 학생은 없음", () => {
    expect(defaultPermissionsForRole("admin")).toEqual(ALL_PERMISSIONS);
    expect(defaultPermissionsForRole("student")).toEqual([]);
  });

  it("권한이 지정되지 않은 메뉴는 누구에게나 보인다", () => {
    expect(hasPermission([], undefined)).toBe(true);
    expect(hasPermission([], "homework.grade")).toBe(false);
    expect(hasPermission(["homework.grade"], "homework.grade")).toBe(true);
  });
});

describe("역할 미리보기(View as)", () => {
  it("쿠키 값 검증: 정해진 값만 허용", () => {
    expect(parseViewAs("franchisee")).toBe("franchisee");
    expect(parseViewAs("hq_staff")).toBe("hq_staff");
    expect(parseViewAs("teacher")).toBe("teacher");
    expect(parseViewAs("admin")).toBe("admin");
    expect(parseViewAs("student")).toBeNull();
    expect(parseViewAs("")).toBeNull();
    expect(parseViewAs(undefined)).toBeNull();
  });

  it("진짜 admin 만 전환할 수 있다", () => {
    expect(resolveEffectiveRole("admin", "teacher")).toBe("teacher");
    expect(resolveEffectiveRole("admin", "franchisee")).toBe("franchisee");
    expect(resolveEffectiveRole("admin", "hq_staff")).toBe("hq_staff");
    expect(resolveEffectiveRole("admin", null)).toBe("admin");
  });

  it("선생님·학생이 쿠키를 조작해도 권한이 올라가지 않는다", () => {
    expect(resolveEffectiveRole("teacher", "admin")).toBe("teacher");
    expect(resolveEffectiveRole("teacher", "franchisee")).toBe("teacher");
    expect(resolveEffectiveRole("student", "admin")).toBe("student");
    expect(resolveEffectiveRole("franchisee", "admin")).toBe("franchisee");
    expect(resolveEffectiveRole("hq_staff", "admin")).toBe("hq_staff");
  });
});
