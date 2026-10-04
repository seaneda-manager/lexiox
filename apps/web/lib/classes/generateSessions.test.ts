import { describe, expect, it } from "vitest";
import { generateSessions, normalizeTime, sessionKey, type MeetingTemplate } from "./generateSessions";

const mon16: MeetingTemplate = { id: "m1", class_id: "c1", weekday: 1, start_time: "16:00", duration_min: 90 };
const wed16: MeetingTemplate = { id: "m2", class_id: "c1", weekday: 3, start_time: "16:00:00", duration_min: 90 };

// 2026-10-05 = 월요일 (2026-10-04 일요일)
describe("generateSessions - 날짜/요일", () => {
  it("요일이 맞는 날짜만, 범위 양끝 포함해서 만든다", () => {
    const r = generateSessions({ meetings: [mon16, wed16], fromDate: "2026-10-05", toDate: "2026-10-14" });
    expect(r.map((x) => x.session_date)).toEqual(["2026-10-05", "2026-10-07", "2026-10-12", "2026-10-14"]);
  });

  it("일요일(0)과 토요일(6)도 JS getDay 규칙으로 맞는다", () => {
    const sun: MeetingTemplate = { id: "s", class_id: "c1", weekday: 0, start_time: "10:00", duration_min: 60 };
    const sat: MeetingTemplate = { id: "t", class_id: "c1", weekday: 6, start_time: "10:00", duration_min: 60 };
    const r = generateSessions({ meetings: [sun, sat], fromDate: "2026-10-03", toDate: "2026-10-04" });
    expect(r.map((x) => x.session_date)).toEqual(["2026-10-03", "2026-10-04"]);
  });

  it("월 경계와 연 경계를 넘어도 맞다", () => {
    const thu: MeetingTemplate = { id: "h", class_id: "c1", weekday: 4, start_time: "09:00", duration_min: 60 };
    const r = generateSessions({ meetings: [thu], fromDate: "2026-12-30", toDate: "2027-01-08" });
    expect(r.map((x) => x.session_date)).toEqual(["2026-12-31", "2027-01-07"]);
  });

  it("from > to 이거나 날짜 형식이 틀리면 빈 배열", () => {
    expect(generateSessions({ meetings: [mon16], fromDate: "2026-10-10", toDate: "2026-10-01" })).toEqual([]);
    expect(generateSessions({ meetings: [mon16], fromDate: "bad", toDate: "2026-10-01" })).toEqual([]);
  });

  it("범위는 최대 366일로 제한한다", () => {
    const daily = Array.from({ length: 7 }, (_, i) => ({
      id: `d${i}`, class_id: "c1", weekday: i, start_time: "08:00", duration_min: 30,
    }));
    const r = generateSessions({ meetings: daily, fromDate: "2026-01-01", toDate: "2030-01-01" });
    expect(r.length).toBe(366);
  });
});

describe("generateSessions - 유효 기간(effective_from/to)", () => {
  it("effective_from 이전/effective_to 이후는 만들지 않는다 (경계 포함)", () => {
    const m: MeetingTemplate = { ...mon16, effective_from: "2026-10-12", effective_to: "2026-10-19" };
    const r = generateSessions({ meetings: [m], fromDate: "2026-10-01", toDate: "2026-10-31" });
    expect(r.map((x) => x.session_date)).toEqual(["2026-10-12", "2026-10-19"]);
  });
});

describe("generateSessions - 멱등성", () => {
  it("이미 있는 회차(existing)는 다시 만들지 않는다", () => {
    const first = generateSessions({ meetings: [mon16, wed16], fromDate: "2026-10-05", toDate: "2026-10-14" });
    const second = generateSessions({
      meetings: [mon16, wed16],
      fromDate: "2026-10-05",
      toDate: "2026-10-14",
      existing: first.map(sessionKey),
    });
    expect(second).toEqual([]);
  });

  it("일부만 있으면 없는 것만 만든다", () => {
    const all = generateSessions({ meetings: [mon16], fromDate: "2026-10-05", toDate: "2026-10-19" });
    const partial = generateSessions({
      meetings: [mon16],
      fromDate: "2026-10-05",
      toDate: "2026-10-19",
      existing: [sessionKey(all[0])],
    });
    expect(partial.map((x) => x.session_date)).toEqual(["2026-10-12", "2026-10-19"]);
  });

  it("'16:00' 과 '16:00:00' 은 같은 회차로 취급한다 (DB는 time 을 HH:MM:SS 로 돌려준다)", () => {
    const r = generateSessions({
      meetings: [mon16],
      fromDate: "2026-10-05",
      toDate: "2026-10-05",
      existing: ["c1|2026-10-05|16:00:00"],
    });
    expect(r).toEqual([]);
  });

  it("같은 반·같은 시간의 중복 템플릿이 있어도 회차는 하나만", () => {
    const dup: MeetingTemplate = { ...mon16, id: "dup" };
    const r = generateSessions({ meetings: [mon16, dup], fromDate: "2026-10-05", toDate: "2026-10-05" });
    expect(r.length).toBe(1);
  });

  it("같은 날 시간이 다르면 별개 회차", () => {
    const evening: MeetingTemplate = { ...mon16, id: "e", start_time: "19:00" };
    const r = generateSessions({ meetings: [mon16, evening], fromDate: "2026-10-05", toDate: "2026-10-05" });
    expect(r.map((x) => x.start_time)).toEqual(["16:00:00", "19:00:00"]);
  });

  it("다른 반은 같은 시간이어도 별개 회차", () => {
    const other: MeetingTemplate = { ...mon16, id: "o", class_id: "c2" };
    const r = generateSessions({ meetings: [mon16, other], fromDate: "2026-10-05", toDate: "2026-10-05" });
    expect(r.length).toBe(2);
  });
});

describe("generateSessions - 잘못된 템플릿은 건너뛴다", () => {
  it("요일 범위 밖 / 시간 형식 오류 / 길이 0 이하", () => {
    const bad: MeetingTemplate[] = [
      { ...mon16, id: "a", weekday: 7 },
      { ...mon16, id: "b", start_time: "25:00" },
      { ...mon16, id: "c", duration_min: 0 },
    ];
    expect(generateSessions({ meetings: bad, fromDate: "2026-10-05", toDate: "2026-10-12" })).toEqual([]);
  });

  it("결과 행에 meeting_id 와 kind 가 들어간다", () => {
    const [row] = generateSessions({ meetings: [mon16], fromDate: "2026-10-05", toDate: "2026-10-05" });
    expect(row).toEqual({
      class_id: "c1", session_date: "2026-10-05", start_time: "16:00:00", duration_min: 90, meeting_id: "m1", kind: "regular",
    });
  });
});

describe("normalizeTime", () => {
  it.each([
    ["16:00", "16:00:00"],
    ["16:00:30", "16:00:30"],
    ["09:05", "09:05:00"],
    ["23:59", "23:59:00"],
  ])("%s -> %s", (input, out) => expect(normalizeTime(input)).toBe(out));

  it.each(["24:00", "12:60", "1:00", "abc", ""])("잘못된 값 %s -> null", (input) => {
    expect(normalizeTime(input)).toBeNull();
  });
});
