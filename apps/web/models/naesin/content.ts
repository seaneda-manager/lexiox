// apps/web/models/naesin/content.ts

export type NaesinContentSection =
  | "reading"
  | "grammar"
  | "listening"
  | "writing"
  | "vocab";

export type NaesinSchoolLevel = "middle" | "high";

export type NaesinSourceType =
  | "textbook"
  | "mock_csat"
  | "csat"
  | "external_book"
  | "school_handout"
  | "teacher_made";

export type NaesinContentKind =
  | "source_material"
  | "question_set"
  | "review_set"
  | "drill_set";

export type NaesinQuestionOriginType =
  | "past_exam"
  | "mock_expected"
  | "teacher_made"
  | "adapted";

export interface NaesinContentMeta {
  id: string;
  track: "naesin";
  section: NaesinContentSection;
  schoolLevel: NaesinSchoolLevel;

  title: string;
  sourceType: NaesinSourceType;
  contentKind: NaesinContentKind;
  questionOriginType?: NaesinQuestionOriginType | null;

  sourceBook?: string | null;
  publisher?: string | null;
  grade?: string | null;
  semester?: string | null;
  unit?: string | null;
  chapter?: string | null;

  difficulty?: string | null;
  tags?: string[] | null;

  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
