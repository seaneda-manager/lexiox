import { describe, expect, it } from "vitest";
import { pickReviewWordIds, reviewWindowDays } from "./dayWindowReview";

describe("reviewWindowDays", () => {
  it("1회차는 복습 없음", () => {
    expect(reviewWindowDays(1)).toEqual([]);
    expect(reviewWindowDays(null)).toEqual([]);
  });
  it("2~4회차는 앞선 회차 전부", () => {
    expect(reviewWindowDays(2)).toEqual([1]);
    expect(reviewWindowDays(3)).toEqual([1, 2]);
    expect(reviewWindowDays(4)).toEqual([1, 2, 3]);
  });
  it("5회차부터는 직전 3회차", () => {
    expect(reviewWindowDays(5)).toEqual([2, 3, 4]);
    expect(reviewWindowDays(10)).toEqual([7, 8, 9]);
  });
});

describe("pickReviewWordIds", () => {
  const windowIds = Array.from({ length: 30 }, (_, i) => `w${i}`);

  it("틀린 단어가 모두 들어가고 나머지는 상한까지 채운다", () => {
    const r = pickReviewWordIds({ wrongIds: ["w1", "w2", "w3"], windowIds, cap: 10 });
    expect(r.ids).toHaveLength(10);
    expect(r.wrongIds.sort()).toEqual(["w1", "w2", "w3"]);
    for (const id of ["w1", "w2", "w3"]) expect(r.ids).toContain(id);
  });

  it("틀린 단어가 상한보다 많으면 틀린 단어만 상한만큼", () => {
    const wrong = windowIds.slice(0, 25);
    const r = pickReviewWordIds({ wrongIds: wrong, windowIds, cap: 20 });
    expect(r.ids).toHaveLength(20);
    expect(r.ids.every((id) => wrong.includes(id))).toBe(true);
  });

  it("범위 밖 틀린 단어는 제외하고 중복 없이 뽑는다", () => {
    const r = pickReviewWordIds({ wrongIds: ["zzz", "w1", "w1"], windowIds, cap: 5 });
    expect(r.ids).not.toContain("zzz");
    expect(new Set(r.ids).size).toBe(r.ids.length);
    expect(r.wrongIds).toEqual(["w1"]);
  });

  it("범위 단어가 상한보다 적으면 있는 만큼만", () => {
    const r = pickReviewWordIds({ wrongIds: [], windowIds: ["a", "b"], cap: 20 });
    expect(r.ids.sort()).toEqual(["a", "b"]);
  });
});
