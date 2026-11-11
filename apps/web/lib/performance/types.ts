// 학생 수행 결과 리포트 공용 타입 (서버 수집 → 클라이언트 분석/표시)

export type SectionKey =
  | "reading"
  | "listening"
  | "speaking"
  | "writing"
  | "vocab"
  | "grammar";

export const SECTION_ORDER: SectionKey[] = [
  "reading",
  "listening",
  "speaking",
  "writing",
  "vocab",
  "grammar",
];

export const SECTION_LABEL: Record<SectionKey, string> = {
  reading: "Reading",
  listening: "Listening",
  speaking: "Speaking",
  writing: "Writing",
  vocab: "단어",
  grammar: "문법·내신",
};

/** 오답 심각도: 완전 오답 / 부분 오답 / 약간 오답 */
export type Severity = "complete" | "partial" | "slight";

export const SEVERITY_LABEL: Record<Severity, string> = {
  complete: "완전 오답",
  partial: "부분 오답",
  slight: "약간 오답",
};

/** 문항 1개 수행 기록 (정답 포함) */
export type AttemptRecord = {
  /** 피드백 키로도 쓰는 안정적인 식별자 (세션 id + 문항 id) */
  key: string;
  sessionId: string;
  at: string; // ISO
  subsection: string; // 상세 분야 코드
  subsectionLabel: string;
  stem: string;
  userAnswer: string | null;
  correctAnswer: string | null;
  correct: boolean;
  severity?: Severity; // 오답일 때만
};

/** 시험/세션 1회 기록 (추이용) */
export type SessionRecord = {
  id: string;
  at: string;
  label: string;
  /** 0~100. 점수가 없으면 null */
  pct: number | null;
  correct?: number;
  total?: number;
  /** 점수형 분야(Speaking/Writing)의 원점수 표시용 */
  scoreText?: string;
};

export type SectionData = {
  section: SectionKey;
  sessions: SessionRecord[];
  attempts: AttemptRecord[];
};

export type FeedbackRow = {
  id: string;
  section: string;
  subsection: string;
  question_key: string;
  body: string;
  updated_at: string;
};

export type PerformanceReportData = {
  studentId: string;
  studentName: string;
  generatedAt: string;
  sections: SectionData[];
  feedback: FeedbackRow[];
};
