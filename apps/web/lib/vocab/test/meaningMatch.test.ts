import { describe, expect, it } from "vitest";
import {
  extractMeaningUnits,
  gradeMeaningAnswer,
  joinSlotAnswers,
  posHintOf,
  slotPosHints,
  slotCountFor,
  splitSlotAnswers,
  splitTopLevel,
} from "./meaningMatch";

const ok = (answers: string[], meanings: string[]) => gradeMeaningAnswer(answers, meanings).correct;

describe("뜻 나누기", () => {
  it("쉼표·세미콜론·가운뎃점·슬래시로 나눈다 (전각 쉼표 포함)", () => {
    expect(splitTopLevel("달성하다, 이루다")).toEqual(["달성하다", "이루다"]);
    expect(splitTopLevel("a;b·c/d，e")).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("괄호 안의 구분 기호는 나누지 않는다", () => {
    expect(splitTopLevel("(사실이라고) 추정하다[생각하다], (책임·임무 등을) 떠맡다")).toEqual([
      "(사실이라고) 추정하다[생각하다]",
      "(책임·임무 등을) 떠맡다",
    ]);
  });

  it("입력칸 수는 항목 수(최대 2, 최소 1)", () => {
    expect(slotCountFor(["주소"])).toBe(1);
    expect(slotCountFor(["달성하다, 이루다"])).toBe(2);
    expect(slotCountFor(["가, 나, 다, 라, 마"])).toBe(2);
    expect(slotCountFor(["소득", "수입"])).toBe(2); // 배열 여러 개도 항목으로 센다
    expect(slotCountFor([])).toBe(1);
    expect(slotCountFor(null)).toBe(1);
  });

  it("핵심 뜻이 같은 항목은 한 번만 센다", () => {
    expect(extractMeaningUnits(["(비유적으로) 조심", "조심"]).length).toBe(1);
  });
});

describe("뜻 채점 — 한 칸에 뜻 하나씩", () => {
  const attain = ["달성하다, 이루다"];

  it("칸마다 뜻 하나씩 쓰면 정답 (순서 상관없음)", () => {
    expect(ok(["달성하다", "이루다"], attain)).toBe(true);
    expect(ok(["이루다", "달성하다"], attain)).toBe(true);
  });

  it("하나만 쓰면 오답 (뜻이 2개면 2개 다 필요)", () => {
    const g = gradeMeaningAnswer(["달성하다", ""], attain);
    expect(g.correct).toBe(false);
    expect(g).toMatchObject({ matched: 1, needed: 2 });
  });

  it("같은 뜻을 두 칸에 써도 한 번만 인정", () => {
    expect(ok(["달성하다", "달성하다"], attain)).toBe(false);
  });

  it("틀린 뜻이 섞이면 오답", () => {
    expect(ok(["달성하다", "포기하다"], attain)).toBe(false);
  });

  it("예전 방식(한 칸에 쉼표로 이어 쓰기)도 정답", () => {
    expect(ok(["달성하다, 이루다"], attain)).toBe(true);
    expect(ok(["달성하다 이루다"], attain)).toBe(false); // 구분이 없으면 한 덩어리 → 인정 안 함
  });

  it("띄어쓰기·부호·대소문자 차이는 무시", () => {
    expect(ok(["달 성 하 다", "이.루.다"], attain)).toBe(true);
  });

  it("뜻이 하나뿐이면 한 칸으로 충분", () => {
    expect(ok(["주소"], ["주소"])).toBe(true);
    expect(ok([""], ["주소"])).toBe(false);
  });
});

describe("뜻 채점 — 괄호 설명과 동의 표현", () => {
  const assume = ["(사실이라고) 추정하다[생각하다], (책임·임무 등을) 떠맡다"];

  it("괄호 설명은 안 써도 된다", () => {
    expect(ok(["추정하다", "떠맡다"], assume)).toBe(true);
  });

  it("[ ] 안의 동의 표현도 정답", () => {
    expect(ok(["생각하다", "떠맡다"], assume)).toBe(true);
  });

  it("괄호까지 그대로 써도 정답", () => {
    expect(ok(["(사실이라고) 추정하다[생각하다]", "(책임·임무 등을) 떠맡다"], assume)).toBe(true);
  });

  it("'~하다'를 뺀 형태도 인정 (2글자 이상)", () => {
    expect(ok(["추정", "떠맡다"], assume)).toBe(true);
    expect(ok(["달성", "이루다"], ["달성하다, 이루다"])).toBe(true);
  });

  it("한 글자 줄임은 인정하지 않는다", () => {
    expect(ok(["추", "떠맡다"], assume)).toBe(false);
  });
});

describe("뜻 채점 — 항목이 많을 때(최대 2칸)", () => {
  const many = ["조심, 경계, 예방책, 주의, 대비"]; // 항목 5개 → 2칸, 아무 2개

  it("서로 다른 뜻 2개를 쓰면 정답", () => {
    expect(ok(["경계", "대비"], many)).toBe(true);
  });

  it("1개만 맞으면 오답", () => {
    expect(ok(["경계", ""], many)).toBe(false);
  });

  it("뜻이 여러 배열 항목이어도 같은 방식", () => {
    expect(ok(["보호하다", "지키다"], ["보호하다", "지키다"])).toBe(true);
    expect(ok(["보호하다"], ["보호하다", "지키다"])).toBe(false);
  });
});

describe("뜻 채점 — ~ 표시와 품사 어미(숙어·이어동사 포함)", () => {
  it("~ 와 조사는 안 써도 정답", () => {
    expect(ok(["말하다"], ["~에게 말하다"])).toBe(true);
    expect(ok(["~에게 말하다"], ["~에게 말하다"])).toBe(true);
    expect(ok(["에게 말하다"], ["~에게 말하다"])).toBe(true);
    expect(ok(["막다"], ["~을 막다"])).toBe(true);
  });

  it("형용사·부사 어미 차이는 너그럽게", () => {
    expect(ok(["정확한"], ["정확하다"])).toBe(true);
    expect(ok(["정확히"], ["정확한"])).toBe(true);
    expect(ok(["개인적"], ["개인적인"])).toBe(true);
  });

  it("전혀 다른 뜻은 여전히 오답", () => {
    expect(ok(["포기하다"], ["~에게 말하다"])).toBe(false);
    expect(ok(["개"], ["개인"])).toBe(false);
  });
});

describe("품사 힌트", () => {
  it("뜻 끝말로 추정", () => {
    expect(posHintOf("달성하다")).toBe("동사");
    expect(posHintOf("정확한")).toBe("형용사");
    expect(posHintOf("주소")).toBe("명사");
    expect(posHintOf("(비유적으로) 조심")).toBe("명사");
    expect(posHintOf("")).toBe(null);
  });
  it("칸 수만큼 반환", () => {
    expect(slotPosHints(["달성하다, 주소"])).toEqual(["동사", "명사"]);
  });
});

describe("칸 ↔ 문자열", () => {
  it("칸 구분은 줄바꿈", () => {
    expect(joinSlotAnswers([" 달성하다 ", "이루다"])).toBe("달성하다\n이루다");
    expect(splitSlotAnswers("달성하다\n이루다")).toEqual(["달성하다", "이루다"]);
    expect(splitSlotAnswers(null)).toEqual([""]);
  });
});
