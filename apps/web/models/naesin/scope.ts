// apps/web/models/naesin/scope.ts

import type { NaesinSchoolLevel } from "./content";

export type NaesinExamType =
  | "midterm"
  | "final"
  | "monthly_exam"
  | "practice";

export interface NaesinExamScope {
  id: string;
  schoolLevel: NaesinSchoolLevel;
  schoolName: string;

  academicYear: number;
  grade: string;
  semester: string;
  examType: NaesinExamType;

  title: string;
  memo?: string | null;

  startDate?: string | null;
  endDate?: string | null;

  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NaesinExamScopeItem {
  id: string;
  scopeId: string;
  contentId: string;

  sortOrder: number;
  isRequired: boolean;
  note?: string | null;

  createdAt: string;
}
