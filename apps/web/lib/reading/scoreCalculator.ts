/**
 * TOEFL 2026 Reading 점수 계산 로직
 * ETS 기반 Conversion Table을 사용한 30점 만점 스케일 변환
 */

export interface QuestionScore {
  questionId: string;
  isCorrect: boolean;
  weight?: number; // 기본값 1점, 대형문항 2~3점
}

export interface ScoringResult {
  rawScore: number;
  maxRawScore: number;
  scaledScore: number;
  percentage: number;
  correctCount: number;
}

/**
 * 기본 Reading Conversion Table (20문항 기준)
 * Raw Score → Scaled Score (0~30점)
 */
export const DEFAULT_READING_CONVERSION_TABLE: Record<number, number> = {
  20: 30, 19: 29, 18: 28, 17: 26, 16: 25,
  15: 23, 14: 21, 13: 20, 12: 18, 11: 16,
  10: 15,  9: 13,  8: 11,  7: 9,   6: 7,
   5: 5,   4: 4,   3: 3,   2: 2,   1: 1, 0: 0
};

/**
 * Reading 점수 계산 (원점수 → 30점 환산)
 * @param userAnswers 학생 답변 배열 (questionId, isCorrect, weight)
 * @param conversionTable 변환 테이블 (Raw → Scaled)
 * @returns 원점수, 만점, 환산점수, 백분율
 */
export function calculateReadingScore(
  userAnswers: QuestionScore[],
  conversionTable: Record<number, number> = DEFAULT_READING_CONVERSION_TABLE
): ScoringResult {

  let rawScore = 0;
  let maxRawScore = 0;
  let correctCount = 0;

  userAnswers.forEach((answer) => {
    const weight = answer.weight || 1; // 기본값: 1점
    maxRawScore += weight;

    if (answer.isCorrect) {
      rawScore += weight;
      correctCount += 1;
    }
  });

  // Conversion Table을 사용하여 30점 만점으로 환산
  // 테이블에 정확한 원점수가 있으면 사용, 없으면 비례식으로 보산
  const scaledScore =
    conversionTable[rawScore] ??
    Math.round((rawScore / maxRawScore) * 30);

  const percentage = maxRawScore > 0
    ? Math.round((rawScore / maxRawScore) * 100)
    : 0;

  return {
    rawScore,
    maxRawScore,
    scaledScore,
    percentage,
    correctCount,
  };
}

/**
 * JSON 형식의 학생 답변을 QuestionScore 배열로 변환
 * @param answers JSON 형식 답변 객체
 * @param questionMap 문제 ID별 정답 및 가중치 맵
 * @returns QuestionScore 배열
 */
export function convertAnswersToScoreArray(
  answers: Record<string, any>,
  questionMap: Record<string, { isCorrect: boolean; weight?: number }>
): QuestionScore[] {
  return Object.entries(answers).map(([questionId, studentAnswer]) => {
    const question = questionMap[questionId];

    if (!question) {
      console.warn(`[Reading Score] Question not found: ${questionId}`);
      return {
        questionId,
        isCorrect: false,
        weight: 1,
      };
    }

    // 여러 선택이 가능한 문제 (예: summary)의 경우
    if (Array.isArray(studentAnswer)) {
      const allCorrect = studentAnswer.every(
        (ans) => question.isCorrect === true
      );
      return {
        questionId,
        isCorrect: allCorrect,
        weight: question.weight || 1,
      };
    }

    // 단일 선택 문제의 경우
    return {
      questionId,
      isCorrect: question.isCorrect === true,
      weight: question.weight || 1,
    };
  });
}

/**
 * Summary 문제 채점 (부분 점수 적용)
 * - 2개 선택 시: 2개 모두 맞음 = 2점, 1개 맞음 = 1점
 * - 3개 선택 시: 3개 모두 맞음 = 2점, 2개 맞음 = 1점
 * @param studentChoices 학생이 선택한 선택지 ID 배열
 * @param correctChoices 정답 선택지 ID 배열
 * @returns 얻은 점수 (0 ~ 2점)
 */
export function scoreSummaryQuestion(
  studentChoices: string[],
  correctChoices: string[]
): number {
  const correctCount = studentChoices.filter((choice) =>
    correctChoices.includes(choice)
  ).length;

  const totalCorrect = correctChoices.length;

  if (correctCount === totalCorrect) {
    return 2; // 모두 정답
  } else if (correctCount === totalCorrect - 1) {
    return 1; // 1개 오답
  } else {
    return 0; // 2개 이상 오답
  }
}

/**
 * Insertion 문제 채점 (4개 선택지 중 1개만 정답)
 * @param studentChoice 학생이 선택한 선택지 ID
 * @param correctChoice 정답 선택지 ID
 * @returns 정답 여부 (1점 또는 0점)
 */
export function scoreInsertionQuestion(
  studentChoice: string,
  correctChoice: string
): boolean {
  return studentChoice === correctChoice;
}

/**
 * 단일 객관식 문제 채점 (single/detail/etc)
 * @param studentChoice 학생이 선택한 선택지 ID
 * @param correctChoice 정답 선택지 ID
 * @returns 정답 여부 (1점 또는 0점)
 */
export function scoreSingleQuestion(
  studentChoice: string,
  correctChoice: string
): boolean {
  return studentChoice === correctChoice;
}
