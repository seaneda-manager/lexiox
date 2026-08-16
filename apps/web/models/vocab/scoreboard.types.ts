import type { ScoreboardPeriod } from "@/lib/vocab/scoreboard/period";

export type { ScoreboardPeriod };

export type ScoreboardMetric = "words" | "points";

export type ScoreboardEntry = {
  rank: number;
  student_id: string;
  name: string;
  value: number;
  is_me: boolean;
};

export type ScoreboardRanking = {
  top: ScoreboardEntry[];
  me: { rank: number | null; value: number };
};

export type ScoreboardResponse = {
  period: ScoreboardPeriod;
  range: { start: string; end: string };
  words: ScoreboardRanking;
  points: ScoreboardRanking;
};
