import { describe, expect, it } from "vitest";
import { noticeKindForStatus, pickGuardian } from "./guardianPick";

const g = (id: string, is_primary: boolean, notice_ok = true) => ({ id, is_primary, notice_ok });

describe("pickGuardian", () => {
  it("주 연락처가 있으면 그 번호", () => {
    expect(pickGuardian([g("a", false), g("b", true), g("c", false)])?.id).toBe("b");
  });

  it("주 연락처가 없으면 첫 번째", () => {
    expect(pickGuardian([g("a", false), g("b", false)])?.id).toBe("a");
  });

  it("수신을 꺼 둔 번호는 주 연락처여도 건너뛴다", () => {
    expect(pickGuardian([g("a", true, false), g("b", false, true)])?.id).toBe("b");
  });

  it("받을 수 있는 번호가 없으면 null", () => {
    expect(pickGuardian([])).toBeNull();
    expect(pickGuardian([g("a", true, false)])).toBeNull();
  });

  it("입력 배열을 바꾸지 않는다", () => {
    const list = [g("a", false), g("b", true)];
    pickGuardian(list);
    expect(list.map((x) => x.id)).toEqual(["a", "b"]);
  });
});

describe("noticeKindForStatus", () => {
  it("결석·지각만 안내 대상", () => {
    expect(noticeKindForStatus("absent")).toBe("absent");
    expect(noticeKindForStatus("late")).toBe("late");
  });

  it("출석·사유결석·기록 없음은 대상 아님", () => {
    expect(noticeKindForStatus("present")).toBeNull();
    expect(noticeKindForStatus("excused")).toBeNull();
    expect(noticeKindForStatus(null)).toBeNull();
    expect(noticeKindForStatus(undefined)).toBeNull();
  });
});
