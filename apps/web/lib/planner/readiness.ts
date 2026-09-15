// apps/web/lib/planner/readiness.ts
// Server-only. Computes per-subject exam-readiness % from the student's own
// plan blocks (student_day_blocks) against their registered exams
// (student_exams) — Phase 1 of the readiness dashboard: no AI-generated
// canonical checklist yet, so the denominator is "how much of the plan the
// student made for themselves is done," not "how much of the curriculum."
// See memory: exam_readiness_dashboard_design_2026_09_13.

import type { SupabaseClient } from "@supabase/supabase-js";
import { STUDY_TYPE_KINDS } from "./types";

export type SubjectReadiness = {
  subject: string;
  examId: string;
  examTitle: string;
  dDay: number;
  readinessPct: number;
  weakBlockCount: number;
};

export type WeaknessNoteItem = {
  blockDate: string;
  subject: string | null;
  title: string;
  note: string;
};

function normalizeSubject(s: string): string {
  return s.trim().toLowerCase();
}

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dDay(fromIso: string, toIso: string): number {
  return Math.ceil((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 86_400_000);
}

/**
 * Per-subject readiness % for the student's upcoming exams. Matches plan
 * blocks to an exam by subject + date-in-prep-window rather than requiring
 * `exam_id` (the planner's "add block" form doesn't set it today).
 */
export async function getSubjectReadiness(
  supabase: SupabaseClient,
  academyStudentId: string,
): Promise<SubjectReadiness[]> {
  const todayIso = toIsoDate(new Date());

  const { data: exams } = await supabase
    .from("student_exams")
    .select("id, title, subjects, prep_start_date, end_date")
    .eq("student_id", academyStudentId)
    .gte("end_date", todayIso)
    .order("start_date", { ascending: true });

  if (!exams || exams.length === 0) return [];

  const earliestPrepStart = exams.reduce(
    (min, e) => (e.prep_start_date < min ? e.prep_start_date : min),
    exams[0].prep_start_date,
  );
  const latestEndDate = exams.reduce((max, e) => (e.end_date > max ? e.end_date : max), exams[0].end_date);

  const { data: blocks } = await supabase
    .from("student_day_blocks")
    .select("subject, kind, block_date, concept_done, practice_done, assessment_done, weakness_note")
    .eq("student_id", academyStudentId)
    .in("kind", STUDY_TYPE_KINDS as unknown as string[])
    .not("subject", "is", null)
    .gte("block_date", earliestPrepStart)
    .lte("block_date", latestEndDate);

  const results: SubjectReadiness[] = [];

  for (const exam of exams) {
    for (const rawSubject of exam.subjects ?? []) {
      const norm = normalizeSubject(rawSubject);
      const matching = (blocks ?? []).filter(
        (b) =>
          b.subject &&
          normalizeSubject(b.subject) === norm &&
          b.block_date >= exam.prep_start_date &&
          b.block_date <= exam.end_date,
      );

      const totalChecks = matching.length * 3;
      const doneChecks = matching.reduce(
        (sum, b) => sum + (b.concept_done ? 1 : 0) + (b.practice_done ? 1 : 0) + (b.assessment_done ? 1 : 0),
        0,
      );
      const weakBlockCount = matching.filter(
        (b) => !(b.concept_done && b.practice_done && b.assessment_done),
      ).length;

      results.push({
        subject: rawSubject,
        examId: exam.id,
        examTitle: exam.title,
        dDay: Math.max(0, dDay(todayIso, exam.end_date)),
        readinessPct: totalChecks > 0 ? Math.round((doneChecks / totalChecks) * 100) : 0,
        weakBlockCount,
      });
    }
  }

  return results;
}

/** Recent weakness notes across all subjects, newest first — for the teacher report. */
export async function getRecentWeaknessNotes(
  supabase: SupabaseClient,
  academyStudentId: string,
  limit = 20,
): Promise<WeaknessNoteItem[]> {
  const { data } = await supabase
    .from("student_day_blocks")
    .select("block_date, subject, title, weakness_note")
    .eq("student_id", academyStudentId)
    .not("weakness_note", "is", null)
    .order("block_date", { ascending: false })
    .limit(limit);

  return (data ?? [])
    .filter((b) => b.weakness_note && b.weakness_note.trim())
    .map((b) => ({
      blockDate: b.block_date,
      subject: b.subject,
      title: b.title,
      note: b.weakness_note as string,
    }));
}
