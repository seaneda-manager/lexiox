import { describe, expect, it } from "vitest";
import { applyTotalExamResults, computeTotalExamStatus, selectTotalExamWords } from "./totalExam";

describe("총 시험 시기 (computeTotalExamStatus)", () => {
  it("기록이 전혀 없으면 시기가 아니다", () => {
    const s = computeTotalExamStatus({ today: "2026-11-05", intervalDays: 30, lastTotalOn: null, firstLearnedOn: null });
    expect(s.due).toBe(false);
    expect(s.nextDueOn).toBeNull();
  });

  it("처음 학습한 날로부터 30일이 되는 날 열린다", () => {
    const base = { intervalDays: 30, lastTotalOn: null, firstLearnedOn: "2026-10-06" };
    expect(computeTotalExamStatus({ ...base, today: "2026-11-04" }).due).toBe(false); // 29일째
    expect(computeTotalExamStatus({ ...base, today: "2026-11-05" }).due).toBe(true); // 30일째
    expect(computeTotalExamStatus({ ...base, today: "2026-11-20" }).due).toBe(true); // 지나도 계속 열려 있음
  });

  it("마지막 총 시험이 있으면 그날 기준으로 다시 계산한다", () => {
    const s = computeTotalExamStatus({
      today: "2026-11-30",
      intervalDays: 30,
      lastTotalOn: "2026-11-05",
      firstLearnedOn: "2026-09-01",
    });
    expect(s.due).toBe(false);
    expect(s.nextDueOn).toBe("2026-12-05");
  });

  it("간격을 2주(14일)로 바꾸면 그에 맞춰 열린다", () => {
    const s = computeTotalExamStatus({ today: "2026-11-19", intervalDays: 14, lastTotalOn: "2026-11-05", firstLearnedOn: null });
    expect(s.due).toBe(true);
  });
});

describe("총 시험 단어 선정 (selectTotalExamWords)", () => {
  const rand = () => 0.5;

  it("못 맞힌(lapsed) → 복습 중 → 기간 내 나머지 순으로 채운다", () => {
    const out = selectTotalExamWords({
      periodWordIds: ["p1", "p2", "p3", "p4"],
      lapsedIds: ["l1"],
      openIds: ["o1", "o2"],
      cap: 4,
      rand,
    });
    expect(out).toHaveLength(4);
    expect(out[0]).toBe("l1");
    expect(out.slice(1, 3).sort()).toEqual(["o1", "o2"]);
    expect(out[3].startsWith("p")).toBe(true);
  });

  it("중복은 한 번만, cap 을 넘기지 않는다", () => {
    const out = selectTotalExamWords({
      periodWordIds: ["a", "b", "c"],
      lapsedIds: ["a"],
      openIds: ["a", "b"],
      cap: 10,
      rand,
    });
    expect([...out].sort()).toEqual(["a", "b", "c"]);
  });

  it("약점이 cap 보다 많으면 약점끼리만 채운다", () => {
    const out = selectTotalExamWords({
      periodWordIds: ["p1", "p2"],
      lapsedIds: ["l1", "l2", "l3"],
      openIds: [],
      cap: 2,
      rand,
    });
    expect(out.every((id) => id.startsWith("l"))).toBe(true);
  });
});

describe("총 시험 결과 반영 (applyTotalExamResults)", () => {
  it("테이블 오류가 나도 예외를 던지지 않는다", async () => {
    const broken: any = {
      from: () => {
        throw new Error("boom");
      },
    };
    const r = await applyTotalExamResults(broken, { studentId: "st", results: [{ wordId: "w", correct: true }] });
    expect(r.ok).toBe(false);
  });
  it("맞힌 단어가 없으면 아무것도 하지 않는다", async () => {
    const r = await applyTotalExamResults({} as any, { studentId: "st", results: [{ wordId: "w", correct: false }] });
    expect(r).toEqual({ ok: true, graduated: 0 });
  });
});
