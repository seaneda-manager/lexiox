import { describe, expect, it } from "vitest";
import { classifyMcq, classifyTyped, detectPatterns } from "./analyze";
import type { AttemptRecord } from "./types";

describe("severity", () => {
  it("typed: 철자 한 글자 차이는 약간 오답", () => {
    expect(classifyTyped("recieve", "receive")).toBe("slight");
    expect(classifyTyped("recv", "receive")).toBe("partial");
    expect(classifyTyped("", "receive")).toBe("complete");
    expect(classifyTyped("xyz", "receive")).toBe("complete");
  });
  it("mcq: 무응답은 완전, 부분 함정은 부분", () => {
    expect(classifyMcq(null)).toBe("complete");
    expect(classifyMcq("a", "SCOPE_ERROR")).toBe("partial");
    expect(classifyMcq("a")).toBe("complete");
  });
});

describe("patterns", () => {
  it("반복 오답을 잡는다", () => {
    const mk = (i: number): AttemptRecord => ({
      key: String(i), sessionId: "s", at: `2026-01-0${i + 1}`, subsection: "vocab", subsectionLabel: "어휘",
      stem: "q", userAnswer: "x", correctAnswer: "abandon", correct: false, severity: "complete",
    });
    const p = detectPatterns([mk(0), mk(1), mk(2)]);
    expect(p.some((x) => x.text.includes("abandon(3회)"))).toBe(true);
  });
  it("빈 입력은 빈 배열", () => expect(detectPatterns([])).toEqual([]));
});
