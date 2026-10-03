import { describe, expect, it } from "vitest";
import {
  calculateAdaptiveBandScore,
  calculateFixedBandScore,
  calculateOverallBand,
  createOverallResult,
  type Answer,
} from "./bandScoreCalculator";

/** correct개 정답 + (total - correct)개 오답으로 이루어진 답안 배열 */
function answers(correct: number, total: number, weight?: number): Answer[] {
  return Array.from({ length: total }, (_, i) => ({
    questionId: i,
    isCorrect: i < correct,
    weight,
  }));
}

describe("calculateAdaptiveBandScore - 모듈 라우팅", () => {
  it("Module 1 정답률이 65% 이상이면 HARD", () => {
    const r = calculateAdaptiveBandScore(answers(13, 20), answers(0, 10));
    expect(r.path).toBe("HARD");
  });

  it("Module 1 정답률이 65% 미만이면 EASY (경계 바로 아래)", () => {
    const r = calculateAdaptiveBandScore(answers(12, 20), answers(0, 10));
    expect(r.path).toBe("EASY");
  });

  it("routingThreshold 인자를 존중한다", () => {
    const r = calculateAdaptiveBandScore(answers(10, 20), answers(0, 10), 0.5);
    expect(r.path).toBe("HARD");
  });
});

describe("calculateAdaptiveBandScore - Band 매핑", () => {
  it("HARD 경로는 만점이면 6.0", () => {
    const r = calculateAdaptiveBandScore(answers(20, 20), answers(10, 10));
    expect(r.bandScore).toBe(6.0);
    expect(r.accuracy).toBe(100);
  });

  it("HARD 경로의 최저 Band는 4.0 (오답이 많아도 4.0 밑으로 내려가지 않음)", () => {
    // M1 65% 로 HARD 진입 후 M2 전부 오답: (13+0)/(30) = 43%
    const r = calculateAdaptiveBandScore(answers(13, 20), answers(0, 10));
    expect(r.path).toBe("HARD");
    expect(r.bandScore).toBe(4.0);
  });

  it("EASY 경로의 상한은 4.0 (만점이어도 4.0 초과 불가)", () => {
    // M1 60% → EASY, M2 전부 정답: (12+10)/30 = 73%
    const r = calculateAdaptiveBandScore(answers(12, 20), answers(10, 10));
    expect(r.path).toBe("EASY");
    expect(r.bandScore).toBeLessThanOrEqual(4.0);
  });

  it("EASY 경로 전부 오답이면 1.0", () => {
    const r = calculateAdaptiveBandScore(answers(0, 20), answers(0, 10));
    expect(r.path).toBe("EASY");
    expect(r.bandScore).toBe(1.0);
  });

  it("weight가 점수에 반영된다", () => {
    const r = calculateAdaptiveBandScore(
      [
        { questionId: 1, isCorrect: true, weight: 2 },
        { questionId: 2, isCorrect: false },
      ],
      []
    );
    expect(r.rawScore).toBe(2);
    expect(r.maxRawScore).toBe(3);
  });

  it("빈 입력이어도 NaN이 나오지 않는다", () => {
    const r = calculateAdaptiveBandScore([], []);
    expect(Number.isNaN(r.accuracy)).toBe(false);
    expect(r.bandScore).toBe(1.0);
  });
});

describe("calculateOverallBand", () => {
  it("4개 섹션이 같으면 그대로", () => {
    expect(calculateOverallBand(5, 5, 5, 5)).toBe(5.0);
  });

  it("평균 5.125는 5.0으로 내림", () => {
    expect(calculateOverallBand(5, 5, 5, 5.5)).toBe(5.0);
  });

  it("평균 5.25는 5.5로 올림", () => {
    expect(calculateOverallBand(5, 5, 5.5, 5.5)).toBe(5.5);
  });

  it("결과는 항상 0.5의 배수", () => {
    for (const bands of [
      [1, 2, 3, 4],
      [3.5, 4, 4.5, 6],
      [2.5, 2.5, 3, 3.5],
    ]) {
      const v = calculateOverallBand(bands[0], bands[1], bands[2], bands[3]);
      expect((v * 2) % 1).toBe(0);
    }
  });
});

describe("calculateFixedBandScore", () => {
  it("빈 배열은 1.0", () => {
    expect(calculateFixedBandScore([])).toBe(1.0);
  });

  it.each([
    [5, 6.0],
    [4.5, 6.0],
    [4.4, 5.5],
    [4.0, 5.5],
    [3.5, 5.0],
    [3.0, 4.5],
    [2.5, 4.0],
    [2.0, 3.5],
    [1.5, 3.0],
    [1.0, 2.5],
    [0.5, 2.0],
    [0.4, 1.0],
  ])("평균 %f점 → Band %f", (avg, band) => {
    expect(calculateFixedBandScore([avg])).toBe(band);
  });

  it("여러 Task는 평균을 사용", () => {
    expect(calculateFixedBandScore([5, 4])).toBe(6.0); // 4.5
  });
});

describe("createOverallResult", () => {
  it("섹션 점수와 overallBand를 함께 반환", () => {
    expect(createOverallResult(6, 6, 5.5, 5.5)).toEqual({
      readingBand: 6,
      listeningBand: 6,
      speakingBand: 5.5,
      writingBand: 5.5,
      overallBand: 6.0,
    });
  });
});
