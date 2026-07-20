// apps/web/models/platform/labels.ts

export type UILabelDomain =
  | "weak_tag"
  | "prescription"
  | "analytics_metric"
  | "review_tab"
  | "review_field";

export type UILabelAudience =
  | "common"
  | "student"
  | "parent"
  | "teacher"
  | "admin";

export interface UILabelCatalogItem {
  id: string;
  domain: UILabelDomain;
  key: string;

  track?: "naesin" | "junior" | "toefl" | null;
  section?:
    | "reading"
    | "listening"
    | "speaking"
    | "writing"
    | "grammar"
    | "vocab"
    | null;
  schoolLevel?: "middle" | "high" | null;
  audience?: UILabelAudience | null;

  labelKo: string;
  labelEn?: string | null;

  shortDescriptionKo?: string | null;
  longDescriptionKo?: string | null;

  studentMessageKo?: string | null;
  parentMessageKo?: string | null;
  teacherMessageKo?: string | null;

  sortOrder: number;
  isActive: boolean;

  createdAt: string;
  updatedAt: string;
}

export type UILabelResolved = {
  labelKo: string;
  labelEn?: string | null;
  shortDescriptionKo?: string | null;
  longDescriptionKo?: string | null;
  studentMessageKo?: string | null;
  parentMessageKo?: string | null;
  teacherMessageKo?: string | null;
};

export type UILabelCatalogMap = Record<string, UILabelCatalogItem>;
