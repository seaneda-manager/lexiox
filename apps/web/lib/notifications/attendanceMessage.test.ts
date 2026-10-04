import { describe, expect, it } from "vitest";
import {
  makeAttendanceDedupeKey,
  renderAttendanceMessage,
  sanitizeInline,
  smsByteLength,
  smsKind,
} from "./attendanceMessage";

const base = {
  studentName: "김민준",
  className: "월수 4시 TOEFL반",
  sessionDate: "2026-10-05",
  startTime: "16:00:00",
};

describe("renderAttendanceMessage", () => {
  it("결석: 사실 + 확인 요청", () => {
    expect(renderAttendanceMessage({ ...base, kind: "absent", academyName: "LEXiOX" })).toBe(
      "[LEXiOX] 김민준 학생이 오늘(10월 5일 (월)) 16:00 월수 4시 TOEFL반 수업에 출석하지 않았습니다. 확인 부탁드립니다."
    );
  });

  it("지각: 확인 요청 문구 없음", () => {
    const m = renderAttendanceMessage({ ...base, kind: "late" });
    expect(m).toContain("지각했습니다.");
    expect(m).not.toContain("확인 부탁");
  });

  it("사유결석", () => {
    expect(renderAttendanceMessage({ ...base, kind: "excused" })).toContain("사유결석으로 처리되었습니다.");
  });

  it("학원 이름이 없으면 머리말을 생략한다", () => {
    const m = renderAttendanceMessage({ ...base, kind: "absent" });
    expect(m.startsWith("김민준 학생이")).toBe(true);
    expect(m).not.toContain("[");
  });

  it("반 이름이 비어 있으면 '수업에' 로만 표기", () => {
    const m = renderAttendanceMessage({ ...base, className: "  ", kind: "late" });
    expect(m).toContain("16:00 수업에 지각했습니다.");
  });

  it("교사 메모는 괄호로 덧붙인다", () => {
    const m = renderAttendanceMessage({ ...base, kind: "absent", note: "감기로 연락 옴" });
    expect(m).toContain("(감기로 연락 옴)");
  });

  it("이름이 비어 있으면 '학생' 으로 대체", () => {
    expect(renderAttendanceMessage({ ...base, studentName: "", kind: "late" })).toContain("학생 학생이");
  });

  it("줄바꿈·제어문자로 문구를 변조할 수 없다 (한 줄 유지)", () => {
    const m = renderAttendanceMessage({
      ...base,
      studentName: "김민준\n\n[광고] 지금 클릭",
      className: "반\r\n이름",
      note: "메모\n둘째 줄",
      kind: "absent",
    });
    expect(m).not.toMatch(/[\r\n]/);
  });

  it("긴 입력은 잘라낸다", () => {
    const m = renderAttendanceMessage({ ...base, className: "가".repeat(100), kind: "late" });
    expect(m).toContain("…");
    expect(m.length).toBeLessThan(120);
  });

  it("평가·홍보성 문구가 없다 (출석 사실만)", () => {
    for (const kind of ["absent", "late", "excused"] as const) {
      const m = renderAttendanceMessage({ ...base, kind, academyName: "LEXiOX" });
      expect(m).not.toMatch(/할인|이벤트|등록|추천|성적|부족|게으|문제/);
    }
  });
});

describe("sanitizeInline", () => {
  it("공백 정리와 길이 제한", () => {
    expect(sanitizeInline("  a   b \t c ", 10)).toBe("a b c");
    expect(sanitizeInline("abcdef", 4)).toBe("abc…");
    expect(sanitizeInline(null, 10)).toBe("");
  });
});

describe("makeAttendanceDedupeKey", () => {
  it("종류·수업·학생이 같으면 같은 키, 하나라도 다르면 다른 키", () => {
    const a = makeAttendanceDedupeKey("absent", "s1", "u1");
    expect(a).toBe(makeAttendanceDedupeKey("absent", "s1", "u1"));
    expect(a).not.toBe(makeAttendanceDedupeKey("late", "s1", "u1"));
    expect(a).not.toBe(makeAttendanceDedupeKey("absent", "s2", "u1"));
    expect(a).not.toBe(makeAttendanceDedupeKey("absent", "s1", "u2"));
  });
});

describe("smsByteLength / smsKind", () => {
  it("한글은 2바이트, 영문·숫자는 1바이트", () => {
    expect(smsByteLength("abc")).toBe(3);
    expect(smsByteLength("가나")).toBe(4);
  });

  it("90바이트 경계: 이하 SMS, 초과 LMS", () => {
    expect(smsKind("a".repeat(90))).toBe("SMS");
    expect(smsKind("a".repeat(91))).toBe("LMS");
    expect(smsKind("가".repeat(45))).toBe("SMS");
    expect(smsKind("가".repeat(46))).toBe("LMS");
  });
});
