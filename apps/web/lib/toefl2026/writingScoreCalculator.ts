/**
 * TOEFL 2026 Writing 점수 계산 로직
 * Task 1 (10문항) + Task 2 (Email, 0~5) + Task 3 (Discussion, 0~5)
 * → 1.0~6.0 Band Score + 0~30점 환산
 */

export interface TOEFLWritingInput {
  task1CorrectCount: number; // Task 1: 0 ~ 10
  task2RubricScore: number; // Task 2: 0.0 ~ 5.0
  task3RubricScore: number; // Task 3: 0.0 ~ 5.0
}

export interface TOEFLWritingResult {
  task1ConvertedScore: number; // 5점 만점 환산
  meanRubricScore: number; // 3개 Task 평균 (0.00 ~ 5.00)
  bandScore: number; // 1.0 ~ 6.0
  legacyScaledScore: number; // 0 ~ 30
  cefrLevel: string;
}

/**
 * Writing Band Lookup Table
 * 3개 Task 종합 평균 → Band Score & Legacy 30점 변환
 */
const WRITING_BAND_LOOKUP = [
  { minMean: 4.67, band: 6.0, legacy: 30, cefr: "C2" },
  { minMean: 4.17, band: 5.5, legacy: 28, cefr: "C1/C2" },
  { minMean: 3.67, band: 5.0, legacy: 25, cefr: "C1" },
  { minMean: 3.17, band: 4.5, legacy: 22, cefr: "B2/C1" },
  { minMean: 2.67, band: 4.0, legacy: 19, cefr: "B2" },
  { minMean: 2.17, band: 3.5, legacy: 15, cefr: "B1/B2" },
  { minMean: 1.67, band: 3.0, legacy: 12, cefr: "B1" },
  { minMean: 1.17, band: 2.5, legacy: 9, cefr: "A2" },
  { minMean: 0.67, band: 2.0, legacy: 6, cefr: "A2" },
  { minMean: 0.17, band: 1.5, legacy: 3, cefr: "A1" },
  { minMean: 0.0, band: 1.0, legacy: 0, cefr: "Below A1" },
];

/**
 * ETS 2026 Writing 최종 점수 계산
 *
 * @param input Task 1 정답 수(0~10) + Task 2,3 Rubric 점수(0~5)
 * @returns Band Score(1.0~6.0) + Legacy Score(0~30)
 */
export function calculateUpdatedWritingScore(
  input: TOEFLWritingInput
): TOEFLWritingResult {
  const { task1CorrectCount, task2RubricScore, task3RubricScore } = input;

  // 1. Task 1: 10문제 정답 수 → 0.0 ~ 5.0 스케일 변환
  // 예: 10개 = 5.0 / 8개 = 4.0 / 6개 = 3.0
  const task1ConvertedScore = Number(
    ((task1CorrectCount / 10) * 5).toFixed(2)
  );

  // 2. 3개 Task의 평균 (0.00 ~ 5.00)
  const meanRubricScore = Number(
    (
      (task1ConvertedScore + task2RubricScore + task3RubricScore) /
      3
    ).toFixed(2)
  );

  // 3. Band Lookup Table에서 매핑
  const bandMapping =
    WRITING_BAND_LOOKUP.find((row) => meanRubricScore >= row.minMean) ||
    WRITING_BAND_LOOKUP[WRITING_BAND_LOOKUP.length - 1];

  return {
    task1ConvertedScore,
    meanRubricScore,
    bandScore: bandMapping.band,
    legacyScaledScore: bandMapping.legacy,
    cefrLevel: bandMapping.cefr,
  };
}

/**
 * raw_answers JSON에서 Task별 점수 추출
 *
 * @param rawAnswers 학생이 제출한 raw_answers JSON
 * @returns 파싱된 Task 점수들
 */
export function parseWritingRawAnswers(rawAnswers: any): {
  task1CorrectCount: number;
  task2Submission: string;
  task3Submission: string;
} {
  if (!rawAnswers) {
    return {
      task1CorrectCount: 0,
      task2Submission: "",
      task3Submission: "",
    };
  }

  // raw_answers JSON 파싱
  const parsed = typeof rawAnswers === "string" ? JSON.parse(rawAnswers) : rawAnswers;

  return {
    task1CorrectCount: parsed?.task_1_score_raw ?? 0,
    task2Submission: parsed?.task_2_submission ?? "",
    task3Submission: parsed?.task_3_submission ?? "",
  };
}

/**
 * Writing 최종 점수 계산 (Rubric 포함)
 *
 * @param rawAnswers 학생 raw_answers
 * @param task2RubricScore Task 2 Rubric (0~5)
 * @param task3RubricScore Task 3 Rubric (0~5)
 * @returns 최종 점수 결과
 */
export function calculateWritingScoreWithRubric(
  rawAnswers: any,
  task2RubricScore: number = 0,
  task3RubricScore: number = 0
): TOEFLWritingResult {
  const parsed = parseWritingRawAnswers(rawAnswers);

  return calculateUpdatedWritingScore({
    task1CorrectCount: parsed.task1CorrectCount,
    task2RubricScore,
    task3RubricScore,
  });
}
