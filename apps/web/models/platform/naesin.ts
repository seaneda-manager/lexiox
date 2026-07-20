// apps/web/models/platform/naesin.ts

export type CurriculumTrack = "naesin" | "junior" | "toefl";

export type SectionType =
  | "reading"
  | "listening"
  | "speaking"
  | "writing"
  | "grammar"
  | "vocab";

export type SchoolLevel = "middle" | "high";

export type SourceType =
  | "textbook"
  | "mock_csat"
  | "csat"
  | "external_book"
  | "school_handout"
  | "teacher_made";

export type ExamType =
  | "midterm"
  | "final"
  | "monthly_exam"
  | "mock_test"
  | "daily_quiz"
  | "performance_assessment";

export type ContentStatus = "draft" | "active" | "archived";

export interface ContentMeta {
  id: string;
  track: CurriculumTrack;
  section: SectionType;
  schoolLevel?: SchoolLevel | null;

  title: string;

  sourceType?: SourceType | null;
  sourceBook?: string | null;
  publisher?: string | null;

  grade?: string | null;
  semester?: string | null;
  unit?: string | null;
  chapter?: string | null;

  difficulty?: string | null;
  tags?: string[] | null;

  status: ContentStatus;
  isSchoolSpecific?: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface NaesinExamScope {
  id: string;
  schoolLevel: SchoolLevel;
  schoolName: string;
  academicYear: number;
  grade: string;
  semester: string;
  examType: ExamType;
  title: string;
  memo?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NaesinExamScopeItem {
  id: string;
  scopeId: string;
  contentId: string;
  sortOrder: number;
  required: boolean;
  note?: string | null;
  createdAt: string;
}

export const PLATFORM_TRACKS: CurriculumTrack[] = ["naesin", "junior", "toefl"];

export const PLATFORM_SECTIONS: SectionType[] = [
  "reading",
  "listening",
  "speaking",
  "writing",
  "grammar",
  "vocab",
];

export const NAESIN_SCHOOL_LEVELS: SchoolLevel[] = ["middle", "high"];

export const NAESIN_SOURCE_TYPES: SourceType[] = [
  "textbook",
  "mock_csat",
  "csat",
  "external_book",
  "school_handout",
  "teacher_made",
];

export const NAESIN_EXAM_TYPES: ExamType[] = [
  "midterm",
  "final",
  "monthly_exam",
  "mock_test",
  "daily_quiz",
  "performance_assessment",
];
