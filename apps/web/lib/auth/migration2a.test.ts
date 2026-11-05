import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  FRANCHISEE_DEFAULT_PERMISSIONS,
  PERMISSIONS,
  TEACHER_DEFAULT_PERMISSIONS,
} from "./permissions";

/**
 * 2단계 2-A 마이그레이션(가맹점 구조 기초)이 약속을 지키는지 자동 검사한다.
 *  - expand-only: 기존 데이터를 지우거나 줄이지 않는다
 *  - 여러 번 실행해도 안전(IF NOT EXISTS / ON CONFLICT)
 *  - 직급 시드의 권한 키가 코드(lib/auth/permissions.ts)와 일치하고, 특권 키는 들어 있지 않다
 */

const FILE = path.resolve(__dirname, "../../supabase/migrations/20261105000001_organizations_franchise_core.sql");
const raw = fs.readFileSync(FILE, "utf8");

/** BEGIN; ... COMMIT; 사이의 실행되는 SQL (주석 제외) */
function executableSql(): string {
  const start = raw.indexOf("BEGIN;");
  const end = raw.indexOf("COMMIT;");
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return raw
    .slice(start, end + "COMMIT;".length)
    .split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n");
}

describe("2-A 마이그레이션: expand-only", () => {
  const sql = executableSql();

  it("기존 데이터를 지우거나 줄이는 문장이 없다", () => {
    expect(sql).not.toMatch(/\bDROP\s+(TABLE|COLUMN|INDEX|CONSTRAINT)\b/i);
    expect(sql).not.toMatch(/\bDELETE\s+FROM\b/i);
    expect(sql).not.toMatch(/\bTRUNCATE\b/i);
    expect(sql).not.toMatch(/\bALTER\s+TABLE[^;]*\bDROP\b/i);
  });

  it("하나의 트랜잭션(BEGIN … COMMIT)으로 실행된다", () => {
    expect(sql.trim().startsWith("BEGIN;")).toBe(true);
    expect(sql.trim().endsWith("COMMIT;")).toBe(true);
  });

  it("모든 CREATE TABLE / ADD COLUMN / CREATE INDEX 가 여러 번 실행해도 안전하다(IF NOT EXISTS)", () => {
    for (const m of sql.matchAll(/CREATE\s+TABLE\s+(?!IF NOT EXISTS)/gi)) throw new Error(`CREATE TABLE without IF NOT EXISTS at ${m.index}`);
    for (const m of sql.matchAll(/ADD\s+COLUMN\s+(?!IF NOT EXISTS)/gi)) throw new Error(`ADD COLUMN without IF NOT EXISTS at ${m.index}`);
    for (const m of sql.matchAll(/CREATE\s+(UNIQUE\s+)?INDEX\s+(?!IF NOT EXISTS)/gi)) throw new Error(`CREATE INDEX without IF NOT EXISTS at ${m.index}`);
  });

  it("데이터 채우기는 비어 있는 값(NULL)만 건드린다", () => {
    for (const stmt of sql.split(";").filter((s) => /\bUPDATE\b/i.test(s))) {
      expect(stmt).toMatch(/IS NULL/i);
    }
  });

  it("시드 INSERT 는 중복 실행에 안전하다(ON CONFLICT)", () => {
    expect(sql).toMatch(/INSERT INTO public\.org_positions[\s\S]*ON CONFLICT \(org_id, name\) DO NOTHING/i);
  });

  it("새 테이블은 RLS 를 켠다(서버 키로만 접근)", () => {
    expect(sql).toMatch(/ALTER TABLE public\.org_positions\s+ENABLE ROW LEVEL SECURITY/i);
    expect(sql).toMatch(/ALTER TABLE public\.account_audit_log\s+ENABLE ROW LEVEL SECURITY/i);
  });

  it("되돌리기와 검증 SQL 이 파일에 들어 있다", () => {
    expect(raw).toContain("되돌리기");
    expect(raw).toContain("검증");
    expect(raw).toMatch(/--\s+DROP TABLE IF EXISTS public\.org_positions/);
  });
});

describe("2-A 마이그레이션: 기본 직급 시드와 권한 키 일치", () => {
  const sql = executableSql();
  const block = sql.slice(sql.indexOf("INSERT INTO public.org_positions"));
  const rows = [...block.matchAll(/'(부원장|정교사|조교)',\s*ARRAY\[([\s\S]*?)\]/g)].map((m) => ({
    name: m[1],
    keys: [...m[2].matchAll(/'([a-z_]+\.[a-z_]+)'/g)].map((k) => k[1]),
  }));

  it("직급 3개가 시드된다", () => {
    expect(rows.map((r) => r.name)).toEqual(["부원장", "정교사", "조교"]);
  });

  it("모든 권한 키가 lib/auth/permissions.ts 에 실제로 있는 키다 (오타 방지)", () => {
    const valid = new Set(Object.keys(PERMISSIONS));
    for (const r of rows) for (const k of r.keys) expect(valid.has(k), `${r.name}: ${k}`).toBe(true);
  });

  it("직급 권한은 원장 권한 안에 있다 (원장이 줄 수 있는 상한)", () => {
    const owner = new Set<string>(FRANCHISEE_DEFAULT_PERMISSIONS);
    for (const r of rows) for (const k of r.keys) expect(owner.has(k), `${r.name}: ${k}`).toBe(true);
  });

  it("특권 키(콘텐츠 제작·본사 허브·시스템·직급 관리·가맹점 설정)는 직급에 들어 있지 않다", () => {
    for (const r of rows) {
      for (const k of ["content.produce", "franchise.hq", "system.admin", "branch.staff", "branch.settings", "branches.view_all"]) {
        expect(r.keys).not.toContain(k);
      }
    }
  });

  it("정교사 = 선생님 기본 권한, 조교 ⊂ 정교사, 부원장 ⊃ 정교사", () => {
    const by = Object.fromEntries(rows.map((r) => [r.name, new Set(r.keys)]));
    expect([...by["정교사"]].sort()).toEqual([...TEACHER_DEFAULT_PERMISSIONS].sort());
    for (const k of by["조교"]) expect(by["정교사"].has(k)).toBe(true);
    for (const k of by["정교사"]) expect(by["부원장"].has(k)).toBe(true);
    expect(by["부원장"].has("students.manage")).toBe(true);
  });
});
