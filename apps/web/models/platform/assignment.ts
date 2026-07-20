// apps/web/models/platform/assignment.ts

import type { CurriculumTrack, SectionType } from "./naesin";

export type AssignmentKind = "content" | "bundle" | "flow" | "scope";

export type AssignmentTargetType = "student" | "class";

export type AssignmentStatus =
  | "assigned"
  | "in_progress"
  | "completed"
  | "closed";

export interface Assignment {
  id: string;
  kind: AssignmentKind;
  track: CurriculumTrack;
  section?: SectionType | null;

  title: string;

  targetType: AssignmentTargetType;
  targetId: string;

  contentId?: string | null;
  bundleId?: string | null;
  flowId?: string | null;
  scopeId?: string | null;

  dueAt?: string | null;
  reviewRequired?: boolean;
  retryAllowed?: boolean;

  status: AssignmentStatus;

  createdAt: string;
  updatedAt: string;
}

export const ASSIGNMENT_KINDS: AssignmentKind[] = [
  "content",
  "bundle",
  "flow",
  "scope",
];

export const ASSIGNMENT_TARGET_TYPES: AssignmentTargetType[] = [
  "student",
  "class",
];

export const ASSIGNMENT_STATUSES: AssignmentStatus[] = [
  "assigned",
  "in_progress",
  "completed",
  "closed",
];
