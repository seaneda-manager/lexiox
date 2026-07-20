// apps/web/models/naesin/assignment.ts

export type NaesinAssignmentTargetType = "student" | "class";

export type NaesinAssignmentStatus =
  | "assigned"
  | "in_progress"
  | "completed"
  | "closed";

export interface NaesinAssignment {
  id: string;

  targetType: NaesinAssignmentTargetType;
  targetId: string;

  scopeId: string;
  title: string;

  dueAt?: string | null;
  reviewRequired: boolean;
  retryAllowed: boolean;

  status: NaesinAssignmentStatus;

  createdAt: string;
  updatedAt: string;
}
