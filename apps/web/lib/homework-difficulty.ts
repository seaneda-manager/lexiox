// 깜지 AI 난이도 조절 시스템

import { db } from "@/lib/db";

export type DifficultyLevel = "easy" | "normal" | "hard";

export interface DifficultyStats {
  successRate: number; // 성공률 (0-100)
  avgAttemptsPerCycle: number; // 평균 시도 횟수
  avgTimePerWord: number; // 단어당 평균 시간 (초)
  currentLevel: DifficultyLevel;
  recommendedLevel: DifficultyLevel;
}

/**
 * 학생의 난이도 통계 계산
 */
export async function calculateDifficultyStats(studentId: string): Promise<DifficultyStats> {
  try {
    // 지난 7일간의 성과 분석
    const result = await db.query(
      `
      SELECT
        COUNT(CASE WHEN status = 'completed' THEN 1 END)::float /
        NULLIF(COUNT(*), 0) * 100 as success_rate,

        AVG(CASE
          WHEN status = 'completed' THEN completed_count
          ELSE 3
        END) as avg_attempts,

        AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) / 60 as avg_time_minutes

      FROM vocab_student_homework
      WHERE student_id = $1
        AND created_at >= CURRENT_DATE - INTERVAL '7 days'
      `,
      [studentId]
    );

    const stats = result.rows[0];
    const successRate = parseFloat(stats.success_rate) || 0;
    const avgAttempts = parseFloat(stats.avg_attempts) || 1;
    const avgTime = parseFloat(stats.avg_time_minutes) || 0;

    // 현재 레벨 조회
    const levelResult = await db.query(
      `
      SELECT difficulty_level FROM student_learning_profiles
      WHERE student_id = $1
      `,
      [studentId]
    );

    const currentLevel = (levelResult.rows[0]?.difficulty_level as DifficultyLevel) || "normal";

    // 추천 난이도 계산
    const recommendedLevel = calculateRecommendedLevel(successRate, avgAttempts, avgTime);

    return {
      successRate,
      avgAttemptsPerCycle: avgAttempts,
      avgTimePerWord: avgTime * 60, // 초 단위로 변환
      currentLevel,
      recommendedLevel,
    };
  } catch (error) {
    console.error("Failed to calculate difficulty stats:", error);
    return {
      successRate: 0,
      avgAttemptsPerCycle: 1,
      avgTimePerWord: 0,
      currentLevel: "normal",
      recommendedLevel: "normal",
    };
  }
}

/**
 * 난이도 추천 알고리즘
 * - 성공률 > 90%: 상향
 * - 성공률 < 60%: 하향
 * - 시도 횟수가 많으면 하향
 */
function calculateRecommendedLevel(
  successRate: number,
  avgAttempts: number,
  avgTimeMinutes: number
): DifficultyLevel {
  // 성공률 기준
  if (successRate >= 90 && avgAttempts <= 1.5) {
    return "hard";
  }

  if (successRate < 60 || avgAttempts > 2.5) {
    return "easy";
  }

  return "normal";
}

/**
 * 난이도 변경 적용
 */
export async function updateStudentDifficulty(
  studentId: string,
  newLevel: DifficultyLevel
): Promise<{ ok: boolean; changed: boolean }> {
  try {
    const result = await db.query(
      `
      UPDATE student_learning_profiles
      SET difficulty_level = $1, updated_at = NOW()
      WHERE student_id = $2
      RETURNING difficulty_level
      `,
      [newLevel, studentId]
    );

    if (!result.rows.length) {
      // 프로필이 없으면 생성
      await db.query(
        `
        INSERT INTO student_learning_profiles (student_id, difficulty_level)
        VALUES ($1, $2)
        `,
        [studentId, newLevel]
      );
      return { ok: true, changed: true };
    }

    const changed = result.rows[0].difficulty_level !== newLevel;
    return { ok: true, changed };
  } catch (error) {
    console.error("Failed to update difficulty:", error);
    return { ok: false, changed: false };
  }
}

/**
 * 난이도별 단어 선택
 */
export async function selectWordsByDifficulty(
  studentId: string,
  count: number = 3
): Promise<string[]> {
  try {
    // 학생의 현재 난이도 조회
    const profileResult = await db.query(
      `
      SELECT difficulty_level FROM student_learning_profiles
      WHERE student_id = $1
      `,
      [studentId]
    );

    const level = (profileResult.rows[0]?.difficulty_level as DifficultyLevel) || "normal";

    // 난이도별 단어 선택 기준
    const criteria = {
      easy: {
        minFrequency: 500, // 자주 나오는 단어
        maxLength: 8, // 짧은 단어
        minAttempts: 0, // 처음 하는 단어 우선
      },
      normal: {
        minFrequency: 100,
        maxLength: 12,
        minAttempts: 1,
      },
      hard: {
        minFrequency: 10, // 드문 단어
        maxLength: 20, // 긴 단어
        minAttempts: 2,
      },
    };

    const c = criteria[level];

    // 학생이 아직 완료하지 않은 단어 중 난이도에 맞는 것 선택
    const result = await db.query(
      `
      SELECT w.id
      FROM words w
      WHERE LENGTH(w.word) <= $1
        AND w.frequency >= $2
        AND NOT EXISTS (
          SELECT 1 FROM vocab_student_homework
          WHERE student_id = $3 AND word_id = w.id AND status = 'completed'
        )
      ORDER BY
        CASE WHEN w.frequency < 50 THEN 1 ELSE 0 END DESC,
        RANDOM()
      LIMIT $4
      `,
      [c.maxLength, c.minFrequency, studentId, count]
    );

    return result.rows.map((row: any) => row.id);
  } catch (error) {
    console.error("Failed to select words by difficulty:", error);
    return [];
  }
}

/**
 * 난이도별 학습 시간 추천
 */
export function getRecommendedStudyTime(level: DifficultyLevel): { min: number; max: number } {
  const times = {
    easy: { min: 10, max: 15 }, // 10-15분
    normal: { min: 15, max: 25 }, // 15-25분
    hard: { min: 25, max: 40 }, // 25-40분
  };
  return times[level];
}

/**
 * 난이도별 일일 목표 단어 수
 */
export function getRecommendedDailyGoal(level: DifficultyLevel): number {
  const goals = {
    easy: 5,
    normal: 3,
    hard: 2,
  };
  return goals[level];
}

/**
 * 자동 난이도 조절 (매일 체크)
 */
export async function autoAdjustDifficulty(studentId: string): Promise<{
  adjusted: boolean;
  oldLevel?: DifficultyLevel;
  newLevel?: DifficultyLevel;
}> {
  try {
    const stats = await calculateDifficultyStats(studentId);

    // 추천 난이도가 현재 난이도와 다르면 변경
    if (stats.recommendedLevel !== stats.currentLevel) {
      const result = await updateStudentDifficulty(studentId, stats.recommendedLevel);

      if (result.ok && result.changed) {
        return {
          adjusted: true,
          oldLevel: stats.currentLevel,
          newLevel: stats.recommendedLevel,
        };
      }
    }

    return { adjusted: false };
  } catch (error) {
    console.error("Failed to auto-adjust difficulty:", error);
    return { adjusted: false };
  }
}
