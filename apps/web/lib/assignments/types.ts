// 클라이언트/서버 공용 — server-only 의존성 없음

export type AssignmentKind =
  | "homework"
  | "daily_test"
  | "toefl_section"
  | "toefl_group"
  | "vocab"
  | "jr"
  | "hi_naesin";

export type AssignmentStatus =
  | "pending"
  | "in_progress"
  | "submitted"
  | "completed"
  | "graded"
  | "overdue";

export type AssignmentDateBasis = "due" | "assigned" | "available" | "completed" | "exam";

export type AssignmentItem = {
  id: string;
  kind: AssignmentKind;
  title: string;
  subject?: string;
  date: string; // YYYY-MM-DD
  dateBasis: AssignmentDateBasis;
  status: AssignmentStatus;
  scorePct?: number | null;
  href?: string;
};

export const ASSIGNMENT_KIND_LABEL: Record<AssignmentKind, string> = {
  homework: "숙제",
  daily_test: "Daily Test",
  toefl_section: "영역 배정",
  toefl_group: "Full/Half",
  vocab: "단어",
  jr: "Jr.",
  hi_naesin: "Hi-내신",
};

export const ASSIGNMENT_STATUS_LABEL: Record<AssignmentStatus, string> = {
  pending: "대기",
  in_progress: "진행중",
  submitted: "제출",
  completed: "완료",
  graded: "채점완료",
  overdue: "기한초과",
};

export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
