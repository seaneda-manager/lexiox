import { describe, expect, it } from "vitest";
import { parseGrade, planPromotion } from "./gradePromotion";

describe("planPromotion", () => {
  it("같은 학교급 안에서는 +1", () => {
    expect(planPromotion("고1")).toEqual({ current: "고1", next: "고2", kind: "up" });
    expect(planPromotion("중 2")).toMatchObject({ next: "중3", kind: "up" });
    expect(planPromotion("초5")).toMatchObject({ next: "초6", kind: "up" });
  });
  it("학교급이 바뀌면 school_change", () => {
    expect(planPromotion("중3")).toMatchObject({ next: "고1", kind: "school_change" });
    expect(planPromotion("초6")).toMatchObject({ next: "중1", kind: "school_change" });
  });
  it("고3은 졸업", () => {
    expect(planPromotion("고3")).toMatchObject({ next: null, kind: "graduate" });
  });
  it("긴 표기와 코드 표기도 해석", () => {
    expect(parseGrade("중학교 1학년")).toEqual({ prefix: "중", n: 1 });
    expect(parseGrade("H2")).toEqual({ prefix: "고", n: 2 });
    expect(parseGrade("M3")).toEqual({ prefix: "중", n: 3 });
  });
  it("해석 못 하면 unknown (건드리지 않음)", () => {
    expect(planPromotion("")).toMatchObject({ kind: "unknown", next: null });
    expect(planPromotion(null)).toMatchObject({ kind: "unknown" });
    expect(planPromotion("성인")).toMatchObject({ kind: "unknown" });
    expect(planPromotion("고4")).toMatchObject({ kind: "unknown" });
  });
});
