// apps/web/models/test/index.ts

export type TestKind = "full" | "half" | "section";

export type ProctoringMode = "none" | "gaze_only";
export type ProctoringStatus = "not_required" | "ok" | "suspicious";

export type TestAssignmentStatus =
  | "assigned"
  | "in_progress"
  | "completed"
  | "expired"
  | "cancelled";

export type RetakeRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";

export type TestTemplate = {
  id: string;
  slug: string;
  label: string;
  kind: TestKind;
  section_mask: string[]; // ["R","L","S","W"]
  config: unknown;        // 나중에 Reading/Listening/… 구조랑 연결
  created_by: string | null;
  created_at: string;
};

export type TestAssignment = {
  id: string;
  template_id: string;
  student_id: string;
  teacher_id: string | null;

  kind: TestKind;

  due_at: string | null;
  expires_at: string | null;

  status: TestAssignmentStatus;
  created_at: string;

  template?: TestTemplate; // join 해서 쓸 때
};

export type SectionScores = {
  R?: number;
  L?: number;
  S?: number;
  W?: number;
};

export type TestSession = {
  id: string;
  assignment_id: string;
  started_at: string;
  completed_at: string | null;

  total_score: number | null;
  section_scores: SectionScores | null;
  raw_result: unknown;

  proctoring_mode: ProctoringMode;
  gaze_off_screen_count: number;
  gaze_off_screen_total_ms: number;
  gaze_longest_single_ms: number;
  proctoring_status: ProctoringStatus;
  proctoring_notes: string | null;

  created_at: string;
};

export type RetakeRequest = {
  id: string;
  student_id: string;
  template_id: string;
  last_session_id: string | null;

  status: RetakeRequestStatus;

  reason: string | null;
  created_at: string;
  decided_at: string | null;
  decided_by: string | null;
};
