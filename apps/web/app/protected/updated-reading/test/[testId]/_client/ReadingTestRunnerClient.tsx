// apps/web/app/(protected)/updated-reading/test/[testId]/_client/ReadingTestRunnerClient.tsx
"use client";

import MockTestPlayer from "@/components/reading/MockTestPlayer";
import type { RReadingTest2026 } from "@/models/reading";

type Props = {
  testId: string;
  label: string;
  test: RReadingTest2026;
  /** Present when launched from a student assignment (e.g. /updated-reading/assignments/[id]/start). */
  assignmentId?: string;
};

export default function ReadingTestRunnerClient({ testId, label, test, assignmentId }: Props) {
  return <MockTestPlayer testId={testId} label={label} test={test} assignmentId={assignmentId} />;
}
