import { describe, expect, it } from "vitest";
import {
  computeExpiry,
  generateReportToken,
  hashReportToken,
  isLinkActive,
  isWellFormedToken,
} from "./token";

describe("generateReportToken / hashReportToken", () => {
  it("43자 URL 안전 문자열이고 매번 다르다", () => {
    const a = generateReportToken();
    const b = generateReportToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
  });

  it("많이 만들어도 충돌하지 않는다", () => {
    const set = new Set(Array.from({ length: 2000 }, () => generateReportToken()));
    expect(set.size).toBe(2000);
  });

  it("해시는 결정적이고 64자 hex, 토큰이 다르면 해시도 다르다", () => {
    const t = generateReportToken();
    expect(hashReportToken(t)).toBe(hashReportToken(t));
    expect(hashReportToken(t)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashReportToken(t)).not.toBe(hashReportToken(generateReportToken()));
  });

  it("해시에서 토큰이 그대로 드러나지 않는다", () => {
    const t = generateReportToken();
    expect(hashReportToken(t)).not.toContain(t);
  });

  it("알려진 값과 일치 (SHA-256 구현 검증)", () => {
    expect(hashReportToken("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});

describe("isWellFormedToken", () => {
  it("생성한 토큰은 통과", () => {
    expect(isWellFormedToken(generateReportToken())).toBe(true);
  });

  it.each([
    "",
    "short",
    "a".repeat(42),
    "a".repeat(44),
    `${"a".repeat(42)}!`,
    `${"a".repeat(42)}/`,
    `../${"a".repeat(40)}`,
    `${"a".repeat(42)} `,
    undefined,
    null,
    123,
  ])("잘못된 값 %s 은 거절", (v) => {
    expect(isWellFormedToken(v as any)).toBe(false);
  });
});

describe("computeExpiry / isLinkActive", () => {
  const now = new Date("2026-10-05T00:00:00Z");

  it("기본 14일 뒤", () => {
    expect(computeExpiry(now).toISOString()).toBe("2026-10-19T00:00:00.000Z");
  });

  it("기간은 1~90일로 제한", () => {
    expect(computeExpiry(now, 0).toISOString()).toBe("2026-10-06T00:00:00.000Z");
    expect(computeExpiry(now, 9999).toISOString()).toBe("2027-01-03T00:00:00.000Z");
  });

  it("만료 전에는 유효, 만료 정각부터 무효", () => {
    const expires = "2026-10-19T00:00:00.000Z";
    expect(isLinkActive({ expires_at: expires, revoked_at: null }, new Date("2026-10-18T23:59:59Z"))).toBe(true);
    expect(isLinkActive({ expires_at: expires, revoked_at: null }, new Date("2026-10-19T00:00:00Z"))).toBe(false);
    expect(isLinkActive({ expires_at: expires, revoked_at: null }, new Date("2026-10-20T00:00:00Z"))).toBe(false);
  });

  it("폐기된 링크는 만료 전이어도 무효", () => {
    expect(isLinkActive({ expires_at: "2099-01-01T00:00:00Z", revoked_at: "2026-10-05T00:00:00Z" }, now)).toBe(false);
  });
});
