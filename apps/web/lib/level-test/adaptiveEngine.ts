// 레벨 테스트 2-stage 적응형 라우팅. TOEFL 2026 밴드스케일(bandScoreCalculator.ts)의
// Module1(라우팅) → Module2(HARD/EASY 분기) 패턴을 레벨 테스트용으로 재사용한 버전.
//
// Stage 1: track + sub_level='mid' 문제로 라우팅.
// Stage 2: HARD 분기는 sub_level='high', EASY 분기는 sub_level='low' 문제 풀.
// 최종 레벨은 Stage 2 정답률로 확정.

import type { Track } from "./proficiencyLevels";

export type Branch = "HARD" | "EASY";
export type SubLevel = "low" | "mid" | "high" | "highest";

const ROUTING_THRESHOLD = 0.65;
const ANCHOR_LEVEL: SubLevel = "mid";

export function decideBranch(stage1Accuracy: number): Branch {
  return stage1Accuracy >= ROUTING_THRESHOLD ? "HARD" : "EASY";
}

export function stage2PoolLevel(branch: Branch): SubLevel {
  return branch === "HARD" ? "high" : "low";
}

export function decideFinalLevel(track: Track, branch: Branch, stage2Accuracy: number): SubLevel {
  const hasHighest = track === "toefl";
  if (branch === "HARD") {
    if (hasHighest) return stage2Accuracy >= ROUTING_THRESHOLD ? "highest" : "high";
    return stage2Accuracy >= ROUTING_THRESHOLD ? "high" : "mid";
  }
  return stage2Accuracy >= ROUTING_THRESHOLD ? "mid" : "low";
}

export function anchorLevel(): SubLevel {
  return ANCHOR_LEVEL;
}
