"use client";

import { useRouter } from "next/navigation";
import AssignmentCalendar from "@/components/assignments/AssignmentCalendar";
import type { AssignmentItem } from "@/lib/assignments/types";

type Student = { academyId: string; name: string; grade: string | null };

type Props = {
  students: Student[];
  selectedAcademyId: string | null;
  authId: string | null;
  initialItems: AssignmentItem[];
  initialMonth: string;
};

export default function TeacherHomeworkCalendarClient({
  students,
  selectedAcademyId,
  authId,
  initialItems,
  initialMonth,
}: Props) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <select
        value={selectedAcademyId ?? ""}
        onChange={(e) => router.push(`/teacher/homework-calendar?student=${e.target.value}`)}
        className="w-full max-w-xs rounded-lg border border-neutral-300 px-3 py-2 text-sm"
      >
        {students.map((s) => (
          <option key={s.academyId} value={s.academyId}>
            {s.name}
            {s.grade ? ` (${s.grade})` : ""}
          </option>
        ))}
      </select>

      {selectedAcademyId && (
        <AssignmentCalendar
          key={selectedAcademyId}
          initialItems={initialItems}
          initialMonth={initialMonth}
          authId={authId}
          academyId={selectedAcademyId}
        />
      )}
    </div>
  );
}
