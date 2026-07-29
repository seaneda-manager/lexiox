/**
 * TOEFL 2026 1.0 ~ 6.0 Band Scale 점수 계산 로직
 * ETS 적응형 Module 기반 Band Mapping
 */

export type PathType = "HARD" | "EASY";

export interface Answer {
  questionId: string | number;
  isCorrect: boolean;
  weight?: number; // 기본 1점, 대형/주요 문항 2점
}

export interface SectionScoreResult {
  rawScore: number;
  maxRawScore: number;
  accuracy: number; // 0 ~ 100 (%)
  path: PathType;
  bandScore: number; // 1.0 ~ 6.0
}

export interface OverallScoreResult {
  readingBand: number;
  listeningBand: number;
  speakingBand: number;
  writingBand: number;
  overallBand: number; // 평균 (0.5 단위 반올림)
}

/**
 * 1. Listening / Reading 적응형 섹션 Band Score 산출
 *
 * Module 1 (Routing): 정답률로 Module 2 난이도 결정
 * Module 2 (Adaptive): Hard vs Easy Path 점수 계산
 *
 * @param m1Answers Module 1 답변 배열
 * @param m2Answers Module 2 답변 배열
 * @param routingThreshold Module 2 Hard 진입 기준 (기본값: 65%)
 * @returns 섹션 점수 결과 (경로, 정답률, Band Score)
 */
export function calculateAdaptiveBandScore(
  m1Answers: Answer[],
  m2Answers: Answer[],
  routingThreshold = 0.65
): SectionScoreResult {
  // Module 1 집계
  const m1Max = m1Answers.reduce((acc, cur) => acc + (cur.weight || 1), 0);
  const m1Raw = m1Answers.reduce(
    (acc, cur) => acc + (cur.isCorrect ? cur.weight || 1 : 0),
    0
  );
  const m1Accuracy = m1Max > 0 ? m1Raw / m1Max : 0;

  // Module 2 라우팅 결정 (Hard vs Easy)
  const path: PathType = m1Accuracy >= routingThreshold ? "HARD" : "EASY";

  // Module 2 집계
  const m2Max = m2Answers.reduce((acc, cur) => acc + (cur.weight || 1), 0);
  const m2Raw = m2Answers.reduce(
    (acc, cur) => acc + (cur.isCorrect ? cur.weight || 1 : 0),
    0
  );

  // 전체 통합 정답률 계산
  const totalMax = m1Max + m2Max;
  const totalRaw = m1Raw + m2Raw;
  const totalAccuracy = totalMax > 0 ? totalRaw / totalMax : 0;

  // 1.0 ~ 6.0 Band 매핑
  let bandScore = 1.0;

  if (path === "HARD") {
    // Hard Module 진입자 (Band 4.0 ~ 6.0)
    if (totalAccuracy >= 0.92) bandScore = 6.0;
    else if (totalAccuracy >= 0.83) bandScore = 5.5;
    else if (totalAccuracy >= 0.72) bandScore = 5.0;
    else if (totalAccuracy >= 0.6) bandScore = 4.5;
    else bandScore = 4.0;
  } else {
    // Easy Module 진입자 (Band 1.0 ~ 4.0 상한)
    if (totalAccuracy >= 0.85) bandScore = 4.0;
    else if (totalAccuracy >= 0.7) bandScore = 3.5;
    else if (totalAccuracy >= 0.55) bandScore = 3.0;
    else if (totalAccuracy >= 0.4) bandScore = 2.5;
    else if (totalAccuracy >= 0.25) bandScore = 2.0;
    else if (totalAccuracy >= 0.12) bandScore = 1.5;
    else bandScore = 1.0;
  }

  return {
    rawScore: totalRaw,
    maxRawScore: totalMax,
    accuracy: Math.round(totalAccuracy * 100),
    path,
    bandScore,
  };
}

/**
 * 2. Overall Total Band Score 산출 (0.5 단위 반올림)
 *
 * 4개 섹션(R/L/S/W)의 Band Score 평균을 계산하고 0.5 단위로 반올림
 *
 * @param readingBand Reading 섹션 Band (1.0 ~ 6.0)
 * @param listeningBand Listening 섹션 Band (1.0 ~ 6.0)
 * @param speakingBand Speaking 섹션 Band (1.0 ~ 6.0)
 * @param writingBand Writing 섹션 Band (1.0 ~ 6.0)
 * @returns 최종 Overall Band Score (0.5 단위)
 */
export function calculateOverallBand(
  readingBand: number,
  listeningBand: number,
  speakingBand: number,
  writingBand: number
): number {
  const avg = (readingBand + listeningBand + speakingBand + writingBand) / 4;

  // 0.5 단위 반올림 공식 (예: 5.125 -> 5.0 / 5.25 -> 5.5)
  return Math.round(avg * 2) / 2;
}

/**
 * 3. Speaking / Writing 고정형 Band Score 산출
 *
 * Speaking과 Writing은 모듈이 없으므로 단순 Rubric 점수 기반
 * (0~5.0 또는 0~5 → 1.0~6.0 Band로 변환)
 *
 * @param taskScores Task별 Rubric 점수 배열 (0~5.0)
 * @returns Speaking/Writing Band Score (1.0 ~ 6.0)
 */
export function calculateFixedBandScore(taskScores: number[]): number {
  if (taskScores.length === 0) return 1.0;

  const avgScore =
    taskScores.reduce((a, b) => a + b, 0) / taskScores.length;

  // Rubric 점수 (0~5) → Band 변환
  let bandScore = 1.0;

  if (avgScore >= 4.5) bandScore = 6.0;
  else if (avgScore >= 4.0) bandScore = 5.5;
  else if (avgScore >= 3.5) bandScore = 5.0;
  else if (avgScore >= 3.0) bandScore = 4.5;
  else if (avgScore >= 2.5) bandScore = 4.0;
  else if (avgScore >= 2.0) bandScore = 3.5;
  else if (avgScore >= 1.5) bandScore = 3.0;
  else if (avgScore >= 1.0) bandScore = 2.5;
  else if (avgScore >= 0.5) bandScore = 2.0;
  else bandScore = 1.0;

  return bandScore;
}

/**
 * 4. 통합 Result 생성
 */
export function createOverallResult(
  readingBand: number,
  listeningBand: number,
  speakingBand: number,
  writingBand: number
): OverallScoreResult {
  const overallBand = calculateOverallBand(
    readingBand,
    listeningBand,
    speakingBand,
    writingBand
  );

  return {
    readingBand,
    listeningBand,
    speakingBand,
    writingBand,
    overallBand,
  };
}
