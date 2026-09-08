// 클라이언트/서버 공용 — server-only 의존성 없음

export type PlannerZone = "school" | "academy" | "home";

export type RoutineSlot = {
  id: string;
  zone: "school" | "home";
  weekday: number; // 0=일 .. 6=토
  start_time: string; // "HH:MM"
  end_time: string;
  kind: string;
  label: string | null;
};

export type DayBlock = {
  id: string;
  block_date: string; // YYYY-MM-DD
  zone: PlannerZone;
  start_time: string | null;
  end_time: string | null;
  kind: string;
  subject: string | null;
  exam_id: string | null;
  title: string;
  note: string | null;
  source: "student" | "preset" | "teacher";
  done: boolean;
  done_at: string | null;
};

export type LessonLog = {
  id: string;
  lesson_date: string;
  start_time: string | null;
  end_time: string | null;
  title: string;
  status: "scheduled" | "done" | "canceled";
  plan_note: string | null;
  log_note: string | null;
  homework_note: string | null;
};

export type ExamType =
  | "naesin_midterm"
  | "naesin_final"
  | "mock"
  | "toefl"
  | "performance"
  | "other";

export type ExamSource =
  | "student"
  | "school_period"
  | "assignment"
  | "naesin_schedule"
  | "teacher";

export type StudentExam = {
  id: string;
  exam_type: ExamType;
  title: string;
  subjects: string[];
  start_date: string;
  end_date: string;
  prep_start_date: string;
  preset_key: string | null;
  source: ExamSource;
};

export const EXAM_TYPE_LABEL: Record<ExamType, string> = {
  naesin_midterm: "내신 중간고사",
  naesin_final: "내신 기말고사",
  mock: "모의고사",
  toefl: "TOEFL",
  performance: "수행평가",
  other: "기타 시험",
};

export const EXAM_SOURCE_LABEL: Record<ExamSource, string> = {
  student: "직접 등록",
  school_period: "학교 시험기간",
  assignment: "모의고사 배정",
  naesin_schedule: "내신 일정",
  teacher: "선생님 지정",
};

export const ZONE_LABEL: Record<PlannerZone, string> = {
  school: "학교",
  academy: "학원",
  home: "집",
};

export const ZONE_EMOJI: Record<PlannerZone, string> = {
  school: "🏫",
  academy: "🎓",
  home: "🏠",
};

// day block kind → 한글 라벨 + 색 (tailwind class)
export const BLOCK_KIND_META: Record<string, { label: string; color: string }> = {
  study: { label: "공부", color: "bg-sky-100 text-sky-700" },
  review: { label: "문제풀이·오답", color: "bg-indigo-100 text-indigo-700" },
  test_prep: { label: "시험 마무리", color: "bg-rose-100 text-rose-700" },
  homework: { label: "숙제", color: "bg-violet-100 text-violet-700" },
  memo: { label: "메모", color: "bg-neutral-100 text-neutral-600" },
  meal: { label: "식사", color: "bg-amber-100 text-amber-700" },
  rest: { label: "휴식", color: "bg-emerald-100 text-emerald-700" },
  class: { label: "수업", color: "bg-blue-100 text-blue-700" },
};

// routine slot kind → 한글 라벨
export const SLOT_KIND_LABEL: Record<string, string> = {
  break: "쉬는시간",
  lunch: "점심시간",
  self_study: "자습시간",
  study: "공부",
  homework: "숙제",
  meal: "식사",
  rest: "휴식",
};

export const HOME_BLOCK_KINDS = ["study", "homework", "review", "meal", "rest", "memo"] as const;
export const SCHOOL_BLOCK_KINDS = ["study", "review", "test_prep", "memo"] as const;

export const SUBJECT_CHIPS = ["국어", "영어", "수학", "과학(과탐)", "사회(사탐)", "한국사"];

export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function hhmm(t: string | null): string {
  return t ? t.slice(0, 5) : "";
}
