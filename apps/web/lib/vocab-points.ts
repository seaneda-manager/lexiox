// 깜지 포인트 계산 시스템

export type PronunciationScore = "Great" | "Good" | "Okay" | "Pass" | "Fail";
export type SpellingResult = "perfect" | "partial" | "incorrect";
export type MeaningResult = "correct" | "incorrect";

interface CycleResult {
  pronunciation: PronunciationScore;
  spelling: SpellingResult;
  meaning: MeaningResult;
}

export function calculateCyclePoints(cycle: CycleResult): number {
  let points = 0;

  // 1. 발음 포인트
  switch (cycle.pronunciation) {
    case "Great":
      points += 3;
      break;
    case "Good":
      points += 2;
      break;
    case "Okay":
      points += 1;
      break;
    case "Pass":
      points += 0;
      break;
    case "Fail":
      points += 0;
      break;
  }

  // 2. 스펠링 포인트
  if (cycle.spelling === "perfect") {
    points += 1;
  }

  // 3. 뜻 포인트
  if (cycle.meaning === "correct") {
    points += 2;
  }

  return points;
}

export function calculateCycleBonus(cycle: CycleResult): number {
  // 한 싸이클에서 모든 항목 성공 시 보너스
  if (
    cycle.pronunciation === "Great" &&
    cycle.spelling === "perfect" &&
    cycle.meaning === "correct"
  ) {
    return 2;
  }

  if (
    cycle.pronunciation === "Good" &&
    cycle.spelling === "perfect" &&
    cycle.meaning === "correct"
  ) {
    return 1;
  }

  return 0;
}

export function calculateMasterBonus(cycles: CycleResult[]): number {
  // 3회 사이클 모두 성공 시 보너스
  if (cycles.length < 3) return 0;

  const allGreat = cycles.every((c) => c.pronunciation === "Great");
  const allGoodOrBetter = cycles.every((c) => c.pronunciation === "Great" || c.pronunciation === "Good");

  if (allGreat) {
    return 10; // 완벽 마스터
  }

  if (allGoodOrBetter) {
    return 5; // 우수 마스터
  }

  return 0;
}

export function calculateMethodBonus(method: "text" | "audio"): number {
  // Method A (text): +3, Method B (audio): +5
  return method === "text" ? 3 : 5;
}

export function calculateQualityBonus(attempts: number): number {
  // 음질 문제로 재시도 증가 시 보너스
  if (attempts > 3) {
    return 5; // 노력 인정
  }
  return 0;
}

export function calculateTotalHomeworkPoints(
  cycles: CycleResult[],
  method: "text" | "audio"
): number {
  let total = 0;

  // 사이클별 포인트
  cycles.forEach((cycle) => {
    total += calculateCyclePoints(cycle);
    total += calculateCycleBonus(cycle);
  });

  // 마스터 보너스
  total += calculateMasterBonus(cycles);

  // 방식 보너스
  total += calculateMethodBonus(method);

  return total;
}

// 일일 목표 관련
export const DAILY_POINT_TARGETS = {
  basic: 50,
  standard: 100,
  advanced: 150,
};

export function getDailyRank(points: number): string {
  if (points >= 120) return "🏆 탁월 (120+)";
  if (points >= 80) return "⭐ 우수 (80-120)";
  if (points >= 50) return "✅ 기본 (50-80)";
  return "🔄 진행 중 (<50)";
}

// 주간/월간 등급
export function getWeeklyRank(points: number): string {
  if (points >= 500) return "🥇 골드 (500+)";
  if (points >= 300) return "🥈 실버 (300-500)";
  if (points >= 100) return "🥉 브론즈 (100-300)";
  return "📈 진행 중 (<100)";
}

export function getMonthlyRank(points: number): string {
  if (points >= 3000) return "👑 레전드 (3000+)";
  if (points >= 1500) return "💎 엘리트 (1500-3000)";
  if (points >= 500) return "⭐ 마스터 (500-1500)";
  return "🚀 성장 중 (<500)";
}
