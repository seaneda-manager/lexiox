import { describe, expect, it } from "vitest";
import { defaultPermissionsForRole } from "@/lib/auth/permissions";
import { buildStaffMenu, CONTENT_SECTIONS, S, type StaffRole } from "./staffNav";

const menu = (role: StaffRole, perms?: string[]) => buildStaffMenu(role, perms ?? defaultPermissionsForRole(role));
const hrefs = (role: StaffRole, perms?: string[]) =>
  menu(role, perms)
    .map((i) => i.href)
    .filter(Boolean) as string[];

describe("직원 메뉴 (권한으로 거른 공용 정의)", () => {
  it("Super(admin)는 운영·콘텐츠 제작·본사·시스템을 모두 본다", () => {
    const sections = new Set(menu("admin").map((i) => i.section));
    for (const s of [S.today, S.people, S.assign, S.toefl, S.vocab, S.hq, S.system]) expect(sections.has(s)).toBe(true);
    expect(hrefs("admin")).toContain("/admin/users");
    expect(hrefs("admin")).toContain("/admin/franchise");
  });

  it("원장은 선생님이 보는 메뉴를 모두 포함한다 (원장 ⊇ 선생님)", () => {
    const teacher = new Set(hrefs("teacher"));
    const franchisee = new Set(hrefs("franchisee"));
    for (const h of teacher) {
      // 선생님의 홈(/teacher/home)은 원장에게는 '오늘 현황'으로 대체되므로 제외
      if (h === "/teacher/home") continue;
      expect(franchisee.has(h)).toBe(true);
    }
  });

  it("원장은 학생·반 관리를 하지만 콘텐츠 제작·본사·시스템은 못 본다", () => {
    const h = hrefs("franchisee");
    expect(h).toContain("/admin/students");
    expect(h).toContain("/admin/classes");
    expect(h).toContain("/admin/guardians");
    expect(h).not.toContain("/admin/content/updated-reading");
    expect(h).not.toContain("/admin/franchise");
    expect(h).not.toContain("/admin/users");
  });

  it("원장에게만 직급·권한 관리 메뉴가 있다 (선생님에게는 없다)", () => {
    expect(menu("franchisee").some((i) => i.label.startsWith("직급·권한 관리"))).toBe(true);
    expect(menu("teacher").some((i) => i.label.startsWith("직급·권한 관리"))).toBe(false);
  });

  it("선생님에게는 /admin/* 경로를 보여주지 않는다 (지금 admin 레이아웃이 막고 있음)", () => {
    expect(hrefs("teacher").some((h) => h.startsWith("/admin"))).toBe(false);
  });

  it("선생님 메뉴: 오늘의 수업·학생 현황·시험 출제는 보이고, 학생 추가·학부모 연락처·콘텐츠는 안 보인다", () => {
    const h = hrefs("teacher");
    for (const p of ["/teacher/session", "/teacher/students", "/teacher/vocab-exams", "/teacher/vocab-review"]) {
      expect(h).toContain(p);
    }
    expect(h).not.toContain("/admin/guardians");
    expect(h).not.toContain("/admin/students");
  });

  it("직급 권한이 줄어들면 그 권한의 메뉴만 사라진다 (원장이 정한 직급 시뮬레이션)", () => {
    // 조교: 오늘의 수업 + 출석만
    const assistant = hrefs("teacher", ["today.sessions"]);
    expect(assistant).toContain("/teacher/session");
    expect(assistant).not.toContain("/teacher/vocab-exams");
    expect(assistant).not.toContain("/teacher/students");
    // 권한이 없는 메뉴(할 일 관리, 수업 도구, 설정)는 남는다
    expect(assistant).toContain("/teacher/tasks");
  });

  it("본사직원: 본사 허브·콘텐츠 제작은 보이고, 시스템·원장 운영(학생 추가·반 관리)은 안 보인다", () => {
    const h = hrefs("hq_staff");
    expect(h).toContain("/admin/franchise");
    expect(h).toContain("/admin/content/updated-reading");
    expect(h).not.toContain("/admin/users");
    expect(h).not.toContain("/admin/students");
    expect(h).not.toContain("/admin/classes");
  });

  it("본사직원의 홈과 본사 허브가 같은 경로로 두 번 나오지 않는다", () => {
    const h = hrefs("hq_staff").filter((x) => x === "/admin/franchise");
    expect(h).toHaveLength(1);
  });

  it("같은 경로가 한 메뉴에 두 번 나오지 않는다 (모든 역할)", () => {
    for (const role of ["admin", "hq_staff", "franchisee", "teacher"] as StaffRole[]) {
      const h = hrefs(role);
      expect(new Set(h).size).toBe(h.length);
    }
  });

  it("콘텐츠 제작 섹션 목록은 기본으로 접어 둘 대상이다", () => {
    expect(CONTENT_SECTIONS).toContain(S.toefl);
    expect(CONTENT_SECTIONS).not.toContain(S.today);
  });
});
