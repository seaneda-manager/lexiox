export type Stage2WeaknessKind =
  | "subject"
  | "verb"
  | "object"
  | "complement"
  | "modifier"
  | "head"
  | "phrase"
  | "clause"
  | "parallel"
  | "tense"
  | "voice"
  | "other";

export type Stage2Mistake = {
  id: string;
  sentenceKey: string;
  sentenceIndex: number;
  kind: Stage2WeaknessKind;
  partLabel: string;
  expected?: string | null;
  actual?: string | null;
  reason?: string | null;
  createdAt: string;
};

export type Stage2WeaknessSummaryItem = {
  kind: Stage2WeaknessKind;
  label: string;
  count: number;
  sentenceCount: number;
  severity: "low" | "medium" | "high";
  lastSeenAt: string;
  topReasons: string[];
};

export const STAGE2_WEAKNESS_LABEL: Record<Stage2WeaknessKind, string> = {
  subject: "주어 파악",
  verb: "동사 파악",
  object: "목적어 파악",
  complement: "보어 파악",
  modifier: "수식어 연결",
  head: "핵심어 찾기",
  phrase: "구(phrase) 구분",
  clause: "절(clause) 구분",
  parallel: "병렬 구조",
  tense: "시제 인식",
  voice: "태(수동/능동)",
  other: "기타 구조",
};
