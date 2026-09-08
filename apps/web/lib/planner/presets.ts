// 시험대비 프리셋 — generateExamPrep 가 읽는 파라미터.
// "현실적이고 doable하게" 튜닝할 때 이 파일만 고치면 됨.

export type PresetKey = "standard" | "intensive" | "deep";

export type PhaseSpec = {
  key: string;
  label: string;
  weight: number; // 준비기간을 나눌 때의 상대 비중
  kind: "study" | "review" | "test_prep"; // 생성되는 day block 의 kind
};

export type Preset = {
  key: PresetKey;
  label: string;
  defaultPrepDays: number;
  restWeekday: number | null; // 이 요일엔 블록을 넣지 않음 (0=일). null = 휴식일 없음
  maxBlocksPerDay: number;
  sessionMinutes: number; // 시간 슬롯이 없을 때 블록 기본 길이
  phases: PhaseSpec[]; // 순서대로 진행
};

export const PRESETS: Record<PresetKey, Preset> = {
  standard: {
    key: "standard",
    label: "표준 (D-28)",
    defaultPrepDays: 28,
    restWeekday: 0,
    maxBlocksPerDay: 2,
    sessionMinutes: 40,
    phases: [
      { key: "skim", label: "1회독 훑기", weight: 3, kind: "study" },
      { key: "deepen", label: "2회독 심화", weight: 3, kind: "study" },
      { key: "practice", label: "문제풀이·오답", weight: 3, kind: "review" },
      { key: "final", label: "최종 암기체크", weight: 2, kind: "test_prep" },
    ],
  },
  intensive: {
    key: "intensive",
    label: "집중 (D-14)",
    defaultPrepDays: 14,
    restWeekday: null,
    maxBlocksPerDay: 3,
    sessionMinutes: 50,
    phases: [
      { key: "skim", label: "핵심 훑기", weight: 2, kind: "study" },
      { key: "practice", label: "문제풀이·오답", weight: 4, kind: "review" },
      { key: "final", label: "최종 암기체크", weight: 2, kind: "test_prep" },
    ],
  },
  deep: {
    key: "deep",
    label: "정밀 (D-42)",
    defaultPrepDays: 42,
    restWeekday: 0,
    maxBlocksPerDay: 2,
    sessionMinutes: 40,
    phases: [
      { key: "skim", label: "1회독 훑기", weight: 3, kind: "study" },
      { key: "deepen", label: "2회독 심화", weight: 3, kind: "study" },
      { key: "organize", label: "3회독 정리", weight: 2, kind: "study" },
      { key: "practice", label: "문제풀이·오답", weight: 3, kind: "review" },
      { key: "practice2", label: "오답 2라운드", weight: 2, kind: "review" },
      { key: "final", label: "최종 암기체크", weight: 2, kind: "test_prep" },
    ],
  },
};

export const PRESET_LIST = Object.values(PRESETS);

export function isPresetKey(v: unknown): v is PresetKey {
  return v === "standard" || v === "intensive" || v === "deep";
}
