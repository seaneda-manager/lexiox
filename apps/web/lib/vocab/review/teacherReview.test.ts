import { describe, expect, it } from "vitest";
import {
  classifyReviewStatus,
  compareReviewRows,
  diffDays,
  resolveTotalInterval,
  summarizeStudentReview,
  type ReviewItemRow,
} from "./teacherReview";

const item = (over: Partial<ReviewItemRow> = {}): ReviewItemRow => ({
  student_id: "s",
  status: "open",
  due_on: "2026-11-05",
  last_reviewed_on: null,
  ...over,
});

describe("summarizeStudentReview", () => {
  const today = "2026-11-05";

  it("오늘 기한인 단어는 밀림 0일로 센다", () => {
    const s = summarizeStudentReview([item({ due_on: "2026-11-05" })], today);
    expect(s).toMatchObject({ dueCount: 1, overdueDays: 0, openCount: 1 });
  });

  it("가장 오래 밀린 단어 기준으로 며칠째 밀렸는지 계산한다", () => {
    const s = summarizeStudentReview(
      [item({ due_on: "2026-11-04" }), item({ due_on: "2026-11-01" }), item({ due_on: "2026-11-05" })],
      today,
    );
    expect(s.dueCount).toBe(3);
    expect(s.overdueDays).toBe(4);
  });

  it("미래 기한은 복습 중이지만 아직 '할 것'이 아니다", () => {
    const s = summarizeStudentReview([item({ due_on: "2026-11-09" })], today);
    expect(s).toMatchObject({ dueCount: 0, openCount: 1, overdueDays: 0 });
  });

  it("졸업/종료 항목은 밀림에 안 들어가고, lapsed 는 따로 센다. 마지막 복습일은 가장 최근", () => {
    const s = summarizeStudentReview(
      [
        item({ status: "graduated", due_on: "2026-10-01", last_reviewed_on: "2026-10-03" }),
        item({ status: "lapsed", due_on: "2026-10-01", last_reviewed_on: "2026-11-02" }),
        item({ due_on: "2026-11-06", last_reviewed_on: "2026-11-01" }),
      ],
      today,
    );
    expect(s).toMatchObject({ dueCount: 0, openCount: 1, lapsedCount: 1, lastReviewedOn: "2026-11-02" });
  });
});

describe("상태 분류·정렬", () => {
  const base = { openCount: 0, lapsedCount: 0, lastReviewedOn: null };

  it("밀린 게 없으면 ok, 오늘/하루 밀림은 due, 이틀 이상은 late", () => {
    expect(classifyReviewStatus({ ...base, dueCount: 0, overdueDays: 0 })).toBe("ok");
    expect(classifyReviewStatus({ ...base, dueCount: 5, overdueDays: 0 })).toBe("due");
    expect(classifyReviewStatus({ ...base, dueCount: 5, overdueDays: 1 })).toBe("due");
    expect(classifyReviewStatus({ ...base, dueCount: 5, overdueDays: 2 })).toBe("late");
  });

  it("늦음 → 오늘 할 것 → 정상 순, 같은 상태면 더 오래/많이 밀린 순", () => {
    const rows = [
      { name: "가", status: "ok" as const, overdueDays: 0, dueCount: 0 },
      { name: "나", status: "due" as const, overdueDays: 0, dueCount: 3 },
      { name: "다", status: "late" as const, overdueDays: 3, dueCount: 2 },
      { name: "라", status: "late" as const, overdueDays: 5, dueCount: 1 },
      { name: "마", status: "due" as const, overdueDays: 0, dueCount: 9 },
    ];
    expect([...rows].sort(compareReviewRows).map((r) => r.name)).toEqual(["라", "다", "마", "나", "가"]);
  });
});

describe("resolveTotalInterval", () => {
  const configs = [
    { scope: "global", scope_id: null, total_exam_interval_days: 30 },
    { scope: "class", scope_id: "c1", total_exam_interval_days: 14 },
    { scope: "student", scope_id: "u1", total_exam_interval_days: 60 },
  ];
  it("학생별 > 반별 > 전역 > 기본값", () => {
    expect(resolveTotalInterval(configs, "u1", ["c1"])).toBe(60);
    expect(resolveTotalInterval(configs, "u2", ["c1"])).toBe(14);
    expect(resolveTotalInterval(configs, "u2", ["c9"])).toBe(30);
    expect(resolveTotalInterval([], "u2", [])).toBe(30);
  });
  it("값이 비어 있는(null) 설정은 건너뛴다", () => {
    expect(resolveTotalInterval([{ scope: "global", scope_id: null, total_exam_interval_days: null }], "u", [])).toBe(30);
  });
});

describe("diffDays", () => {
  it("날짜 차이", () => {
    expect(diffDays("2026-11-05", "2026-11-01")).toBe(4);
    expect(diffDays("2026-12-01", "2026-11-30")).toBe(1);
  });
});
