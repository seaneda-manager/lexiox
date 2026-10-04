import { describe, expect, it } from "vitest";
import {
  attendanceRate,
  checkState,
  havrutaQueue,
  isMemberOn,
  stepsDoneCount,
  summarizeAttendance,
  type AttendanceStatus,
  type StepProgress,
} from "./sessionBoard";

describe("isMemberOn - 수업 날짜 기준 소속", () => {
  it("입반일 전 수업은 소속 아님, 입반일 당일부터 소속", () => {
    expect(isMemberOn("2026-10-04", "2026-10-05", null)).toBe(false);
    expect(isMemberOn("2026-10-05", "2026-10-05", null)).toBe(true);
  });

  it("퇴반일 당일 수업까지는 소속, 다음 날부터 아님", () => {
    expect(isMemberOn("2026-10-10", "2026-09-01", "2026-10-10")).toBe(true);
    expect(isMemberOn("2026-10-11", "2026-09-01", "2026-10-10")).toBe(false);
  });

  it("퇴반 안 했으면(left_on null) 계속 소속", () => {
    expect(isMemberOn("2027-01-01", "2026-09-01", null)).toBe(true);
  });

  it("날짜 정보가 없으면(null) 제한 없음으로 본다", () => {
    expect(isMemberOn("2026-10-05", null, null)).toBe(true);
  });
});

describe("summarizeAttendance / checkState", () => {
  const ids = ["a", "b", "c", "d"];

  it("기록이 없으면 전원 미체크", () => {
    const s = summarizeAttendance(ids, []);
    expect(s).toEqual({ total: 4, present: 0, late: 0, absent: 0, excused: 0, unchecked: 4 });
    expect(checkState(s)).toBe("unchecked");
  });

  it("일부만 기록하면 partial", () => {
    const s = summarizeAttendance(ids, [
      { student_id: "a", status: "present" },
      { student_id: "b", status: "late" },
    ]);
    expect(s.unchecked).toBe(2);
    expect(checkState(s)).toBe("partial");
  });

  it("전원 기록하면 done, 상태별로 집계", () => {
    const s = summarizeAttendance(ids, [
      { student_id: "a", status: "present" },
      { student_id: "b", status: "late" },
      { student_id: "c", status: "absent" },
      { student_id: "d", status: "excused" },
    ]);
    expect(s).toEqual({ total: 4, present: 1, late: 1, absent: 1, excused: 1, unchecked: 0 });
    expect(checkState(s)).toBe("done");
  });

  it("명단에 없는 학생의 기록은 무시한다 (이미 퇴반한 학생 등)", () => {
    const s = summarizeAttendance(["a"], [
      { student_id: "a", status: "present" },
      { student_id: "ghost", status: "absent" },
    ]);
    expect(s.total).toBe(1);
    expect(s.absent).toBe(0);
  });

  it("학생이 0명이면 done (체크할 게 없음)", () => {
    expect(checkState(summarizeAttendance([], []))).toBe("done");
  });
});

describe("havrutaQueue - 하브루타 1:1 대기열", () => {
  const prep = "havruta_prep";
  const one = "havruta_1on1";
  const steps = (m: Record<string, StepProgress>) => new Map(Object.entries(m));
  const att = (m: Record<string, AttendanceStatus>) => new Map(Object.entries(m));

  it("준비 완료 + 1:1 미완료만 포함, 준비를 먼저 끝낸 순서", () => {
    const q = havrutaQueue({
      studentIds: ["a", "b", "c", "d"],
      steps: steps({
        a: { [prep]: { done_at: "2026-10-05T16:40:00Z" } },
        b: { [prep]: { done_at: "2026-10-05T16:30:00Z" } },
        c: { [prep]: { done_at: "2026-10-05T16:20:00Z" }, [one]: { done_at: "2026-10-05T16:50:00Z" } },
        d: {},
      }),
      attendance: att({}),
      prepKey: prep,
      oneOnOneKey: one,
    });
    expect(q).toEqual(["b", "a"]); // c는 이미 1:1 끝, d는 준비 전
  });

  it("결석/사유결석 학생은 대기열에서 제외", () => {
    const q = havrutaQueue({
      studentIds: ["a", "b"],
      steps: steps({
        a: { [prep]: { done_at: "2026-10-05T16:30:00Z" } },
        b: { [prep]: { done_at: "2026-10-05T16:31:00Z" } },
      }),
      attendance: att({ a: "absent" }),
      prepKey: prep,
      oneOnOneKey: one,
    });
    expect(q).toEqual(["b"]);
  });

  it("done_at 이 null 이면 완료로 보지 않는다", () => {
    const q = havrutaQueue({
      studentIds: ["a"],
      steps: steps({ a: { [prep]: { done_at: null } } }),
      attendance: att({}),
      prepKey: prep,
      oneOnOneKey: one,
    });
    expect(q).toEqual([]);
  });

  it("준비 시각이 같으면 id 순으로 안정 정렬", () => {
    const at = "2026-10-05T16:30:00Z";
    const q = havrutaQueue({
      studentIds: ["b", "a"],
      steps: steps({ a: { [prep]: { done_at: at } }, b: { [prep]: { done_at: at } } }),
      attendance: att({}),
      prepKey: prep,
      oneOnOneKey: one,
    });
    expect(q).toEqual(["a", "b"]);
  });
});

describe("attendanceRate", () => {
  const rec = (...s: AttendanceStatus[]) => s.map((status) => ({ status }));

  it("출석+지각을 출석으로 세고 결석은 분모에만 넣는다", () => {
    expect(attendanceRate(rec("present", "late", "absent", "present"))).toEqual({ attended: 3, counted: 4, rate: 75 });
  });

  it("사유결석은 분모에서 뺀다", () => {
    expect(attendanceRate(rec("present", "excused", "excused"))).toEqual({ attended: 1, counted: 1, rate: 100 });
  });

  it("센 수업이 없으면 null (0%가 아님)", () => {
    expect(attendanceRate([]).rate).toBeNull();
    expect(attendanceRate(rec("excused")).rate).toBeNull();
  });

  it("전부 결석이면 0%", () => {
    expect(attendanceRate(rec("absent", "absent")).rate).toBe(0);
  });

  it("반올림", () => {
    expect(attendanceRate(rec("present", "present", "absent")).rate).toBe(67);
  });
});

describe("stepsDoneCount", () => {
  it("완료된 단계 수만 센다", () => {
    const p: StepProgress = { s1: { done_at: "x" }, s2: { done_at: null }, s3: { done_at: "y" } };
    expect(stepsDoneCount(p, ["s1", "s2", "s3", "s4"])).toBe(2);
    expect(stepsDoneCount(undefined, ["s1"])).toBe(0);
  });
});
