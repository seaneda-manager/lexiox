import { describe, expect, it } from "vitest";
import { buildReportSummary, type ReportRecord } from "./summary";

const rec = (status: ReportRecord["status"], date: string, time = "16:00:00", cls = "A반"): ReportRecord => ({
  status,
  session_date: date,
  start_time: time,
  class_name: cls,
});

const TODAY = "2026-10-28";

describe("buildReportSummary - 기간", () => {
  it("오늘 포함 28일 안의 기록만 센다 (경계 포함)", () => {
    // from = 2026-10-01 (28일 창)
    const s = buildReportSummary(
      [rec("present", "2026-09-30"), rec("present", "2026-10-01"), rec("absent", "2026-10-28"), rec("present", "2026-10-29")],
      TODAY
    );
    expect(s.from).toBe("2026-10-01");
    expect(s.to).toBe(TODAY);
    expect(s.total).toBe(2); // 9/30(범위 밖)·10/29(미래)는 제외
    expect(s.present).toBe(1);
    expect(s.absent).toBe(1);
  });

  it("기록이 없으면 0이고 출석률은 null", () => {
    const s = buildReportSummary([], TODAY);
    expect(s.total).toBe(0);
    expect(s.rate).toBeNull();
    expect(s.recent).toEqual([]);
  });
});

describe("buildReportSummary - 집계", () => {
  it("상태별 개수와 출석률 (사유결석은 분모에서 제외)", () => {
    const s = buildReportSummary(
      [rec("present", "2026-10-05"), rec("late", "2026-10-07"), rec("absent", "2026-10-12"), rec("excused", "2026-10-14"), rec("present", "2026-10-19")],
      TODAY
    );
    expect(s).toMatchObject({ total: 5, present: 2, late: 1, absent: 1, excused: 1 });
    expect(s.rate).toBe(75); // (2+1)/(2+1+1)
  });

  it("최근 기록은 최신순이고 12개까지만", () => {
    const records = Array.from({ length: 20 }, (_, i) => rec("present", `2026-10-${String(i + 1).padStart(2, "0")}`));
    const s = buildReportSummary(records, TODAY);
    expect(s.recent).toHaveLength(12);
    expect(s.recent[0].session_date).toBe("2026-10-20");
    expect(s.recent[11].session_date).toBe("2026-10-09");
  });

  it("같은 날짜면 늦은 수업이 먼저", () => {
    const s = buildReportSummary([rec("present", "2026-10-05", "16:00:00"), rec("late", "2026-10-05", "19:00:00")], TODAY);
    expect(s.recent.map((r) => r.start_time)).toEqual(["19:00:00", "16:00:00"]);
  });

  it("입력 배열을 바꾸지 않는다", () => {
    const records = [rec("present", "2026-10-05"), rec("absent", "2026-10-06")];
    const copy = [...records];
    buildReportSummary(records, TODAY);
    expect(records).toEqual(copy);
  });
});

describe("개인정보: 메모가 구조적으로 들어갈 수 없다", () => {
  it("결과 어디에도 note 필드가 없다", () => {
    // 입력 타입에 note 가 없다. 런타임에 몰래 넣어도 결과로 흘러나오지 않는지도 확인한다.
    const sneaky = [{ ...rec("absent", "2026-10-05"), note: "교사 내부 메모" } as ReportRecord];
    const s = buildReportSummary(sneaky, TODAY);
    expect(JSON.stringify(s)).not.toContain("교사 내부 메모");
  });
});
