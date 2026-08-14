/**
 * Vocab Mode 전환 로직
 * Mode 1 → 2 → 3 → 4 순차 진행
 * 점수/조건에 따라 진행 여부 결정
 */

import type {
  VocabLearningSession,
  VocabLearningMode,
  Mode2Result,
  Mode3Result,
  ModeTransitionResult,
  MODE_PROGRESSION_RULES,
} from "@/lib/types/vocab-learning-mode";

/**
 * Mode 완료 여부 판단
 */
export function isModeComplete(
  mode: VocabLearningMode,
  session: VocabLearningSession
): boolean {
  switch (mode) {
    case 1:
      // PreScreen: uncheckedWords가 있으면 완료
      return session.mode1?.uncheckedWordIds.size ?? 0 > 0;

    case 2:
      // Speed: 모든 단어에 답변이 있으면 완료
      return (
        Object.keys(session.mode2?.answers ?? {}).length ===
        session.allWords.length
      );

    case 3:
      // Synonym: 모든 단어에 답변이 있으면 완료
      return (
        Object.keys(session.mode3?.answers ?? {}).length ===
        (session.mode3?.words.length ?? 0)
      );

    case 4:
      // Homework: 모든 단어에 correction이 있으면 완료
      return (
        Object.keys(session.mode4?.corrections ?? {}).length ===
        (session.mode4?.words.length ?? 0)
      );

    default:
      return false;
  }
}

/**
 * Mode 점수 계산
 */
export function calculateModeScore(
  mode: VocabLearningMode,
  session: VocabLearningSession
): number {
  switch (mode) {
    case 1:
      // PreScreen: 점수 없음 (체크만 함)
      return 100;

    case 2:
      return session.mode2?.score ?? 0;

    case 3:
      return session.mode3?.score ?? 0;

    case 4:
      // Homework: 완료 여부만 (0 or 100)
      return isModeComplete(4, session) ? 100 : 0;

    default:
      return 0;
  }
}

/**
 * Mode 2 완료 후 Mode 3으로 진행할 단어들 결정
 */
export function getMode3Words(session: VocabLearningSession): string[] {
  const wrongWordIds: string[] = [];

  // Mode 2 오답들
  if (session.mode2?.results) {
    session.mode2.results.forEach((result: Mode2Result) => {
      if (!result.correct) {
        wrongWordIds.push(result.wordId);
      }
    });
  }

  // 총 단어 중 일부만 선택 (옵션)
  // 예: 오답 + 새로운 단어 섞기
  return wrongWordIds;
}

/**
 * Mode 3 완료 후 Mode 4로 진행할 단어들 결정
 */
export function getMode4Words(session: VocabLearningSession): string[] {
  const wrongWordIds: string[] = [];

  // Mode 3 오답들만
  if (session.mode3?.results) {
    session.mode3.results.forEach((result: Mode3Result) => {
      if (!result.correct) {
        wrongWordIds.push(result.wordId);
      }
    });
  }

  return wrongWordIds;
}

/**
 * 다음 Mode 결정
 */
export function getNextMode(
  currentMode: VocabLearningMode
): VocabLearningMode | null {
  switch (currentMode) {
    case 1:
      return 2;
    case 2:
      return 3;
    case 3:
      return 4;
    case 4:
      return null; // 학습 완료
    default:
      return null;
  }
}

/**
 * Mode 전환 가능 여부 판단
 */
export function canTransitionToNextMode(
  currentMode: VocabLearningMode,
  session: VocabLearningSession
): ModeTransitionResult {
  // 현재 Mode 완료 여부 확인
  if (!isModeComplete(currentMode, session)) {
    return {
      ok: false,
      currentMode,
      canAdvance: false,
      message: `Mode ${currentMode}를 먼저 완료하세요`,
    };
  }

  const nextMode = getNextMode(currentMode);
  if (!nextMode) {
    return {
      ok: true,
      currentMode,
      canAdvance: false,
      message: "모든 Mode 완료!",
    };
  }

  // 점수 기반 진행 판단
  const score = calculateModeScore(currentMode, session);
  const rules = (MODE_PROGRESSION_RULES as any)[currentMode];
  const minScore = rules?.minScoreToPass ?? 0;

  if (score < minScore) {
    if (rules?.onFailAction === "retry") {
      return {
        ok: true,
        currentMode,
        nextMode: currentMode, // 같은 Mode 재시도
        canAdvance: false,
        score,
        message: `${minScore}점 이상이 필요합니다 (현재: ${score}점). 다시 시도하세요.`,
      };
    } else if (rules?.onFailAction === "remedial") {
      // 치유 모드 (오답 복습)
      return {
        ok: true,
        currentMode,
        nextMode: currentMode, // 오답만 다시
        canAdvance: false,
        score,
        message: `오답 복습이 필요합니다`,
        wordsToReview: getMode3Words(session), // 오답 목록
      };
    } else {
      // skip: 낮은 점수라도 다음 Mode로
      return {
        ok: true,
        currentMode,
        nextMode,
        canAdvance: true,
        score,
        message: `다음 Mode (${nextMode})로 진행합니다`,
      };
    }
  }

  // 점수 충분 → 다음 Mode로
  return {
    ok: true,
    currentMode,
    nextMode,
    canAdvance: true,
    score,
    message: `Mode ${nextMode}로 진행합니다`,
    wordsToReview:
      nextMode === 3
        ? getMode3Words(session)
        : nextMode === 4
          ? getMode4Words(session)
          : undefined,
  };
}

/**
 * Mode 별 전체 점수에 가중치 적용
 */
export function calculateTotalScore(session: VocabLearningSession): number {
  const weights = {
    1: 0.1, // PreScreen: 10%
    2: 0.4, // Speed: 40%
    3: 0.3, // Synonym: 30%
    4: 0.2, // Homework: 20%
  };

  let totalScore = 0;
  let totalWeight = 0;

  for (let mode = 1; mode <= 4; mode++) {
    const m = mode as VocabLearningMode;
    const weight = weights[m];
    const modeScore = calculateModeScore(m, session);

    // 완료된 Mode만 계산
    if (modeScore > 0) {
      totalScore += modeScore * weight;
      totalWeight += weight;
    }
  }

  // 가중치로 정규화
  return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
}

/**
 * Mode별 소요 시간 (예상)
 */
export const ESTIMATED_MODE_DURATION: Record<VocabLearningMode, number> = {
  1: 180, // 3분
  2: 600, // 10분
  3: 600, // 10분
  4: 900, // 15분
};

/**
 * Mode 순차 진행 현황 (진행률 계산)
 */
export function getProgressPercentage(
  session: VocabLearningSession
): Record<VocabLearningMode, number> {
  return {
    1: session.mode1 ? 100 : 0,
    2: session.mode2 ? 100 : 0,
    3: session.mode3 ? 100 : 0,
    4: session.mode4 ? 100 : 0,
  };
}
