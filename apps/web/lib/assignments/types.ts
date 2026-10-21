// 클라이언트/서버 공용 — server-only 의존성 없음

export type AssignmentKind =
  | "homework"
  | "daily_test"
  | "toefl_section"
  | "toefl_group"
  | "vocab"
  | "jr"
  | "hi_naesin"
  | "middle_naesin";

// 영역(스킬)별 보기용. 배정 시스템(kind)과 별개로 "무엇을 공부하는 과제인가"를 나타낸다.
export type AssignmentArea =
  | "reading"
  | "grammar"
  | "vocab"
  | "listening"
  | "speaking"
  | "writing"
  | "exam"
  | "other";

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
  area?: AssignmentArea;
};

export const ASSIGNMENT_KIND_LABEL: Record<AssignmentKind, string> = {
  homework: "숙제",
  daily_test: "Daily Test",
  toefl_section: "영역 배정",
  toefl_group: "Full/Half",
  vocab: "단어",
  jr: "Jr.",
  hi_naesin: "Hi-내신",
  middle_naesin: "중학내신",
};

export const ASSIGNMENT_AREA_LABEL: Record<AssignmentArea, string> = {
  reading: "Reading",
  grammar: "Grammar",
  vocab: "Voca",
  listening: "Listening",
  speaking: "Speaking",
  writing: "Writing",
  exam: "시험·모의",
  other: "기타",
};

export const ASSIGNMENT_AREA_ORDER: AssignmentArea[] = [
  "reading",
  "grammar",
  "vocab",
  "listening",
  "speaking",
  "writing",
  "exam",
  "other",
];

/** 과목명/유형 문자열에서 영역을 추정한다. 못 알아보면 undefined (호출 쪽에서 기본값 결정). */
export function areaFromText(text: unknown): AssignmentArea | undefined {
  const t = String(text ?? "").toLowerCase();
  if (!t) return undefined;
  if (/vocab|voca|word|단어|어휘|숙어/.test(t)) return "vocab";
  if (/grammar|문법/.test(t)) return "grammar";
  if (/listen|듣기|청해/.test(t)) return "listening";
  if (/speak|말하기|회화|구술/.test(t)) return "speaking";
  if (/writ|작문|쓰기|에세이/.test(t)) return "writing";
  if (/read|독해|읽기|본문|해석/.test(t)) return "reading";
  if (/mock|모의|exam|시험|full|half/.test(t)) return "exam";
  return undefined;
}

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
