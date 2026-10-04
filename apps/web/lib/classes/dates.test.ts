import { describe, expect, it } from "vitest";
import { addDaysISO, addMinutesHHMM, formatKoreanDate, isISODate, timeRange, todayKST } from "./dates";

describe("addMinutesHHMM / timeRange", () => {
  it("분 더하기와 시간 넘김", () => {
    expect(addMinutesHHMM("16:00:00", 90)).toBe("17:30");
    expect(addMinutesHHMM("16:45", 30)).toBe("17:15");
  });

  it("자정을 넘으면 다음 날 시각으로 표시", () => {
    expect(addMinutesHHMM("23:30:00", 60)).toBe("00:30");
  });

  it("형식이 틀리면 그대로 돌려준다", () => {
    expect(addMinutesHHMM("abc", 30)).toBe("abc");
  });

  it("범위 표기", () => {
    expect(timeRange("16:00:00", 90)).toBe("16:00–17:30");
  });
});

describe("todayKST", () => {
  it("UTC 로는 전날이어도 한국에서는 이미 다음 날이면 한국 날짜를 준다", () => {
    // 2026-10-04 20:00 UTC = 2026-10-05 05:00 KST
    expect(todayKST(Date.UTC(2026, 9, 4, 20, 0, 0))).toBe("2026-10-05");
  });

  it("한국 자정 직전/직후 경계", () => {
    // 2026-10-04 14:59:59 UTC = 2026-10-04 23:59:59 KST
    expect(todayKST(Date.UTC(2026, 9, 4, 14, 59, 59))).toBe("2026-10-04");
    // 2026-10-04 15:00:00 UTC = 2026-10-05 00:00:00 KST
    expect(todayKST(Date.UTC(2026, 9, 4, 15, 0, 0))).toBe("2026-10-05");
  });
});

describe("addDaysISO", () => {
  it("월·연 경계와 음수", () => {
    expect(addDaysISO("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDaysISO("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysISO("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDaysISO("2028-03-01", -1)).toBe("2028-02-29"); // 윤년
  });
});

describe("isISODate / formatKoreanDate", () => {
  it("형식과 실제 날짜 검사", () => {
    expect(isISODate("2026-10-05")).toBe(true);
    expect(isISODate("2026-13-05")).toBe(false);
    expect(isISODate("2026-10-5")).toBe(false);
    expect(isISODate(undefined)).toBe(false);
  });

  it("요일 포함 한국어 표기", () => {
    expect(formatKoreanDate("2026-10-05")).toBe("10월 5일 (월)");
    expect(formatKoreanDate("2026-10-04")).toBe("10월 4일 (일)");
  });
});
