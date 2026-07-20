// apps/web/components/reading/runner/runnerProfiles.ts
export type ReadingRunnerLayout = "toefl" | "classic";
export type ReadingRunnerMode = "test" | "exam" | "practice" | "drill" | "review" | "study";

export type ReadingRunnerProfile = {
  id: string;
  label: string;

  // layout/ux
  layout: ReadingRunnerLayout;
  gateFirst: boolean;
  allowPrev: boolean;

  // feedback & locking
  enableSubmit: boolean;        // submitReadingAnswer / finishReadingSession 사용 여부
  revealAfterCheck: boolean;    // practice/drill에서 "Check" 후 해설 표시
  lockAfterCheck: boolean;      // Check 후 답 고정

  // display
  showCorrectness: boolean;     // correct/incorrect 표시
  showExplanation: boolean;     // q.meta.explanation / clue_quote 표시
};

// ✅ UPDATED-TOEFL: "시험 UI"가 SSOT
export const toeflProfiles = {
  toefl_test: {
    id: "toefl_test",
    label: "TOEFL · TEST",
    layout: "toefl",
    gateFirst: true,
    allowPrev: true,
    enableSubmit: true,
    revealAfterCheck: false,
    lockAfterCheck: false,
    showCorrectness: false,
    showExplanation: false,
  } satisfies ReadingRunnerProfile,

  toefl_review: {
    id: "toefl_review",
    label: "TOEFL · REVIEW",
    layout: "toefl",
    gateFirst: false,
    allowPrev: true,
    enableSubmit: false,
    revealAfterCheck: false,
    lockAfterCheck: false,
    showCorrectness: true,
    showExplanation: true,
  } satisfies ReadingRunnerProfile,

  toefl_practice: {
    id: "toefl_practice",
    label: "TOEFL · PRACTICE",
    layout: "toefl",
    gateFirst: true,
    allowPrev: true,
    enableSubmit: true,
    revealAfterCheck: true,
    lockAfterCheck: true,
    showCorrectness: true,
    showExplanation: true,
  } satisfies ReadingRunnerProfile,

  toefl_drill: {
    id: "toefl_drill",
    label: "TOEFL · DRILL",
    layout: "toefl",
    gateFirst: false,
    allowPrev: true,
    enableSubmit: true,
    revealAfterCheck: true,
    lockAfterCheck: true,
    showCorrectness: true,
    showExplanation: true,
  } satisfies ReadingRunnerProfile,
} as const;

// ✅ LingoX: "트랙"이 SSOT (여기선 기본만 깔고, track별로 label만 바꿔 끼우면 됨)
export const lingoxProfiles = {
  lingox_ms: {
    id: "lingox_ms",
    label: "LingoX · MS (내신)",
    layout: "classic",
    gateFirst: false,
    allowPrev: true,
    enableSubmit: true,
    revealAfterCheck: true,
    lockAfterCheck: true,
    showCorrectness: true,
    showExplanation: true,
  } satisfies ReadingRunnerProfile,

  lingox_hs: {
    id: "lingox_hs",
    label: "LingoX · HS (모의)",
    layout: "classic",
    gateFirst: true,
    allowPrev: true,
    enableSubmit: true,
    revealAfterCheck: true,
    lockAfterCheck: true,
    showCorrectness: true,
    showExplanation: true,
  } satisfies ReadingRunnerProfile,

  lingox_junior: {
    id: "lingox_junior",
    label: "LingoX · Junior",
    layout: "classic",
    gateFirst: false,
    allowPrev: true,
    enableSubmit: true,
    revealAfterCheck: true,
    lockAfterCheck: true,
    showCorrectness: true,
    showExplanation: true,
  } satisfies ReadingRunnerProfile,
} as const;

export type RunnerProfileId =
  | keyof typeof toeflProfiles
  | keyof typeof lingoxProfiles;

export function getRunnerProfile(profileId?: string): ReadingRunnerProfile {
  if (profileId && (profileId in toeflProfiles)) {
    return (toeflProfiles as any)[profileId];
  }
  if (profileId && (profileId in lingoxProfiles)) {
    return (lingoxProfiles as any)[profileId];
  }
  // default: keep legacy behavior close to current RunnerV2
  return toeflProfiles.toefl_test;
}