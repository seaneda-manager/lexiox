// 깜지 배지 & 랭킹 시스템

import { db } from "@/lib/db";

export type BadgeType =
  | "first_homework"
  | "week_champion"
  | "month_champion"
  | "perfect_week"
  | "perfect_month"
  | "consistency_7days"
  | "consistency_30days"
  | "audio_master"
  | "text_master"
  | "speed_reader";

export interface Badge {
  type: BadgeType;
  name: string;
  description: string;
  icon: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  unlockedAt?: Date;
}

export const BADGES: Record<BadgeType, Badge> = {
  first_homework: {
    type: "first_homework",
    name: "첫 발걸음",
    description: "첫 깜지를 완료했어요",
    icon: "🎯",
    rarity: "common",
  },
  week_champion: {
    type: "week_champion",
    name: "주간 챔피언",
    description: "이주 깜지 포인트 1위",
    icon: "🥇",
    rarity: "rare",
  },
  month_champion: {
    type: "month_champion",
    name: "월간 챔피언",
    description: "이번 달 깜지 포인트 1위",
    icon: "👑",
    rarity: "legendary",
  },
  perfect_week: {
    type: "perfect_week",
    name: "완벽한 주",
    description: "7일 연속 깜지 완료",
    icon: "⭐",
    rarity: "rare",
  },
  perfect_month: {
    type: "perfect_month",
    name: "완벽한 달",
    description: "30일 연속 깜지 완료",
    icon: "💫",
    rarity: "legendary",
  },
  consistency_7days: {
    type: "consistency_7days",
    name: "일관성 7일",
    description: "7일 연속 학습",
    icon: "🔥",
    rarity: "uncommon",
  },
  consistency_30days: {
    type: "consistency_30days",
    name: "일관성 30일",
    description: "30일 연속 학습",
    icon: "🌟",
    rarity: "epic",
  },
  audio_master: {
    type: "audio_master",
    name: "음성 마스터",
    description: "오디오 깜지 100개 완료",
    icon: "🎙️",
    rarity: "epic",
  },
  text_master: {
    type: "text_master",
    name: "텍스트 마스터",
    description: "텍스트 깜지 100개 완료",
    icon: "📝",
    rarity: "epic",
  },
  speed_reader: {
    type: "speed_reader",
    name: "빠른 학습자",
    description: "하루에 깜지 10개 완료",
    icon: "⚡",
    rarity: "rare",
  },
};

/**
 * 학생이 배지를 획득했는지 확인하고 저장
 */
export async function checkAndAwardBadges(studentId: string): Promise<BadgeType[]> {
  const awardedBadges: BadgeType[] = [];

  // 1. 첫 깜지 완료
  if (await checkFirstHomework(studentId)) {
    awardedBadges.push("first_homework");
  }

  // 2. 주간 챔피언
  if (await checkWeekChampion(studentId)) {
    awardedBadges.push("week_champion");
  }

  // 3. 월간 챔피언
  if (await checkMonthChampion(studentId)) {
    awardedBadges.push("month_champion");
  }

  // 4. 완벽한 주 (7일 연속)
  if (await checkPerfectWeek(studentId)) {
    awardedBadges.push("perfect_week");
  }

  // 5. 일관성 7일
  if (await checkConsistency(studentId, 7)) {
    awardedBadges.push("consistency_7days");
  }

  // 6. 음성 마스터
  if (await checkAudioMaster(studentId)) {
    awardedBadges.push("audio_master");
  }

  // 7. 텍스트 마스터
  if (await checkTextMaster(studentId)) {
    awardedBadges.push("text_master");
  }

  // 8. 빠른 학습자 (하루 10개)
  if (await checkSpeedReader(studentId)) {
    awardedBadges.push("speed_reader");
  }

  // DB에 저장
  for (const badgeType of awardedBadges) {
    try {
      await db.query(
        `
        INSERT INTO student_badges (student_id, badge_type, unlocked_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (student_id, badge_type) DO NOTHING
        `,
        [studentId, badgeType]
      );
    } catch (error) {
      console.error(`Failed to award badge ${badgeType}:`, error);
    }
  }

  return awardedBadges;
}

/**
 * 배지 확인 함수들
 */

async function checkFirstHomework(studentId: string): boolean {
  const result = await db.query(
    `
    SELECT COUNT(*) as count FROM vocab_student_homework
    WHERE student_id = $1 AND status = 'completed'
    `,
    [studentId]
  );
  return parseInt(result.rows[0].count) === 1;
}

async function checkWeekChampion(studentId: string): boolean {
  const result = await db.query(
    `
    SELECT COUNT(*) as rank FROM (
      SELECT student_id, SUM(points) as total_points
      FROM vocab_daily_points
      WHERE date >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY student_id
      ORDER BY total_points DESC
    ) rankings
    WHERE student_id = $1
    `,
    [studentId]
  );
  return parseInt(result.rows[0].rank) === 1;
}

async function checkMonthChampion(studentId: string): boolean {
  const result = await db.query(
    `
    SELECT COUNT(*) as rank FROM (
      SELECT student_id, SUM(points) as total_points
      FROM vocab_daily_points
      WHERE EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM NOW())
        AND EXTRACT(MONTH FROM date) = EXTRACT(MONTH FROM NOW())
      GROUP BY student_id
      ORDER BY total_points DESC
    ) rankings
    WHERE student_id = $1
    `,
    [studentId]
  );
  return parseInt(result.rows[0].rank) === 1;
}

async function checkPerfectWeek(studentId: string): boolean {
  const result = await db.query(
    `
    SELECT COUNT(DISTINCT date) as completed_days
    FROM vocab_daily_points
    WHERE student_id = $1
      AND date >= CURRENT_DATE - INTERVAL '7 days'
      AND total_points > 0
    `,
    [studentId]
  );
  return parseInt(result.rows[0].completed_days) >= 7;
}

async function checkConsistency(studentId: string, days: number): boolean {
  const result = await db.query(
    `
    WITH RECURSIVE dates AS (
      SELECT CURRENT_DATE - INTERVAL '1 day' * (row_number() OVER ()) as date
      FROM generate_series(1, $2)
    )
    SELECT COUNT(*) as missing_days
    FROM dates d
    WHERE NOT EXISTS (
      SELECT 1 FROM vocab_daily_points
      WHERE student_id = $1 AND date = d.date AND total_points > 0
    )
    `,
    [studentId, days]
  );
  return parseInt(result.rows[0].missing_days) === 0;
}

async function checkAudioMaster(studentId: string): boolean {
  const result = await db.query(
    `
    SELECT COUNT(*) as count FROM vocab_student_homework
    WHERE student_id = $1 AND homework_type = 'audio' AND status = 'completed'
    `,
    [studentId]
  );
  return parseInt(result.rows[0].count) >= 100;
}

async function checkTextMaster(studentId: string): boolean {
  const result = await db.query(
    `
    SELECT COUNT(*) as count FROM vocab_student_homework
    WHERE student_id = $1 AND homework_type = 'text' AND status = 'completed'
    `,
    [studentId]
  );
  return parseInt(result.rows[0].count) >= 100;
}

async function checkSpeedReader(studentId: string): boolean {
  const result = await db.query(
    `
    SELECT COUNT(*) as count FROM vocab_student_homework
    WHERE student_id = $1 AND DATE(created_at) = CURRENT_DATE AND status = 'completed'
    `,
    [studentId]
  );
  return parseInt(result.rows[0].count) >= 10;
}

/**
 * 학생의 배지 목록 조회
 */
export async function getStudentBadges(studentId: string): Promise<Badge[]> {
  try {
    const result = await db.query(
      `
      SELECT badge_type, unlocked_at
      FROM student_badges
      WHERE student_id = $1
      ORDER BY unlocked_at DESC
      `,
      [studentId]
    );

    return result.rows.map((row: any) => ({
      ...BADGES[row.badge_type as BadgeType],
      unlockedAt: row.unlocked_at,
    }));
  } catch (error) {
    console.error("Failed to get student badges:", error);
    return [];
  }
}

/**
 * 클래스/학원 랭킹 조회
 */
export async function getClassRanking(classId: string, period: "week" | "month" | "all" = "week") {
  try {
    const dateFilter =
      period === "week"
        ? "date >= CURRENT_DATE - INTERVAL '7 days'"
        : period === "month"
          ? "EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM NOW()) AND EXTRACT(MONTH FROM date) = EXTRACT(MONTH FROM NOW())"
          : "1=1";

    const result = await db.query(
      `
      SELECT
        ROW_NUMBER() OVER (ORDER BY SUM(dp.total_points) DESC) as rank,
        s.id,
        u.name,
        u.avatar_url,
        SUM(dp.total_points) as total_points,
        COUNT(DISTINCT dp.date) as completed_days,
        SUM(h.points) as homework_points
      FROM academy_students s
      JOIN users u ON u.id = s.user_id
      LEFT JOIN vocab_daily_points dp ON dp.student_id = s.id AND ${dateFilter}
      LEFT JOIN vocab_student_homework h ON h.student_id = s.id AND ${dateFilter}
      WHERE s.academy_class_id = $1
      GROUP BY s.id, u.name, u.avatar_url
      ORDER BY total_points DESC
      LIMIT 100
      `,
      [classId]
    );

    return result.rows;
  } catch (error) {
    console.error("Failed to get class ranking:", error);
    return [];
  }
}

/**
 * 전체 학원 랭킹 조회
 */
export async function getAcademyRanking(academyId: string, period: "week" | "month" | "all" = "week") {
  try {
    const dateFilter =
      period === "week"
        ? "date >= CURRENT_DATE - INTERVAL '7 days'"
        : period === "month"
          ? "EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM NOW()) AND EXTRACT(MONTH FROM date) = EXTRACT(MONTH FROM NOW())"
          : "1=1";

    const result = await db.query(
      `
      SELECT
        ROW_NUMBER() OVER (ORDER BY SUM(dp.total_points) DESC) as rank,
        s.id,
        u.name,
        u.avatar_url,
        c.name as class_name,
        SUM(dp.total_points) as total_points,
        COUNT(DISTINCT dp.date) as completed_days
      FROM academy_students s
      JOIN users u ON u.id = s.user_id
      JOIN academy_classes c ON c.id = s.academy_class_id
      LEFT JOIN vocab_daily_points dp ON dp.student_id = s.id AND ${dateFilter}
      WHERE c.academy_id = $1
      GROUP BY s.id, u.name, u.avatar_url, c.name
      ORDER BY total_points DESC
      LIMIT 100
      `,
      [academyId]
    );

    return result.rows;
  } catch (error) {
    console.error("Failed to get academy ranking:", error);
    return [];
  }
}
