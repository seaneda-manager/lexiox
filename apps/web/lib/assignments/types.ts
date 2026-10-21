// 클라이언트/서버 공용 — server-only 의존성 없음

export type AssignmentKind =
  | "homework"
  | "daily_test"
  | "toefl_section"
  | "toefl_group"
  | "vocab"
  | "jr"
  | "hi_naesin"
  | "middle_naesin"
  | "middle_general";

// ── 프로그램(수강 구분) ───────────────────────────────────────────
// 1. Updated TOEFL  2. Hi-내신(고등 내신)  3. 중학 = 중학내신(학교 시험 대비) + 중학일반(고등 공부 준비)  4. Jr.(초등)
// 중학일반 콘텐츠는 Hi-내신 시스템에 중학 학년(M1~M3) 지문으로 만들어 쓰므로, 지문 학년으로 구분한다.
export type AssignmentProgram = "updated_toefl" | "hi_naesin" | "middle" | "jr";

export const ASSIGNMENT_PROGRAM_LABEL: Record<AssignmentProgram, string> = {
  updated_toefl: "Updated TOEFL",
  hi_naesin: "Hi-내신",
  middle: "중학",
  jr: "Jr.",
};

export const ASSIGNMENT_PROGRAM_ORDER: AssignmentProgram[] = ["updated_toefl", "hi_naesin", "middle", "jr"];

/** 학생에게 저장된 프로그램: 트랙은 하나만(서로 겹치지 않음), TOEFL 은 어느 트랙과도 함께 가능. */
export type StudentProgram = { track: "hi_naesin" | "middle" | "jr" | null; hasToefl: boolean };

/** 트랙도 TOEFL 도 비어 있으면 "아직 지정 안 됨" */
export const isProgramSet = (sp: StudentProgram | null | undefined): sp is StudentProgram => !!sp && (!!sp.track || sp.hasToefl);

export function explicitPrograms(sp: StudentProgram): AssignmentProgram[] {
  const out: AssignmentProgram[] = [];
  if (sp.hasToefl) out.push("updated_toefl");
  if (sp.track) out.push(sp.track);
  return out;
}

/** 어느 프로그램의 과제인가. null = 프로그램 공통(숙제 채점, 단어). */
export function programOfKind(kind: AssignmentKind): AssignmentProgram | null {
  switch (kind) {
    case "daily_test":
    case "toefl_section":
    case "toefl_group":
      return "updated_toefl";
    case "hi_naesin":
      return "hi_naesin";
    case "middle_naesin":
    case "middle_general":
      return "middle";
    case "jr":
      return "jr";
    default:
      return null;
  }
}

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
  middle_general: "중학일반",
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

/**
 * 학생의 프로그램을 기준으로 과제가 어느 프로그램 소속인지 정한다.
 * - Hi-내신 지문 라이브러리(hi_naesin / middle_general)는 어느 프로그램 학생에게나 배정될 수 있으므로,
 *   지문 학년이 아니라 "학생의 트랙"에 속한다. 트랙이 없으면 TOEFL, 그것도 없으면 지문 쪽 프로그램.
 * - 그 밖의 과제는 종류가 정하는 프로그램에 속한다.
 * - 학생 프로그램이 아직 지정되지 않았으면(sp 없음) 지금까지처럼 종류(콘텐츠) 기준이다.
 */
export function programOfItem(kind: AssignmentKind, sp: StudentProgram | null): AssignmentProgram | null {
  const natural = programOfKind(kind);
  if (!isProgramSet(sp)) return natural;
  if (kind === "hi_naesin" || kind === "middle_general") {
    return sp.track ?? (sp.hasToefl ? "updated_toefl" : natural);
  }
  return natural;
}
