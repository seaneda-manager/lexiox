import { describe, expect, it } from "vitest";
import { formatKoreanMobile, normalizeKoreanMobile } from "./phone";

describe("normalizeKoreanMobile - 허용되는 형식", () => {
  it.each([
    ["010-1234-5678", "01012345678"],
    ["01012345678", "01012345678"],
    ["010 1234 5678", "01012345678"],
    ["(010)1234-5678", "01012345678"],
    ["  010.1234.5678  ", "01012345678"],
    ["+82 10-1234-5678", "01012345678"],
    ["82-10-1234-5678", "01012345678"],
    ["+82 (0)10-1234-5678", "01012345678"],
    ["011-123-4567", "0111234567"],
    ["016-1234-5678", "01612345678"],
  ])("%s -> %s", (input, value) => {
    const r = normalizeKoreanMobile(input);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(value);
  });

  it("화면용 하이픈 표기를 같이 돌려준다", () => {
    const r = normalizeKoreanMobile("01012345678");
    expect(r.ok).toBe(true);
    expect(r.display).toBe("010-1234-5678");
    expect(r.reason).toBe("");
  });
});

describe("normalizeKoreanMobile - 거부", () => {
  it.each([null, undefined, "", "   "])("빈 값(%s)은 empty", (input) => {
    const r = normalizeKoreanMobile(input as any);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("empty");
  });

  it.each([
    "02-1234-5678", // 유선
    "031-123-4567", // 유선
    "010-1234-567", // 010 은 11자리여야 함
    "010-12345-67890",
    "0101234", // 너무 짧음
    "abc",
    "123-4567-8901",
    "020-1234-5678", // 휴대폰 대역 아님
  ])("%s 는 invalid", (input) => {
    const r = normalizeKoreanMobile(input);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("invalid");
    expect(r.value).toBe(""); // 실패한 값이 저장 경로로 새지 않도록 비어 있어야 한다
  });
});

describe("formatKoreanMobile", () => {
  it("11자리/10자리 표기", () => {
    expect(formatKoreanMobile("01012345678")).toBe("010-1234-5678");
    expect(formatKoreanMobile("0111234567")).toBe("011-123-4567");
  });
});
