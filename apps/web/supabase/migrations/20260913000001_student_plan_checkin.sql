-- Student plan check-in: per-block concept/practice/assessment sub-checks + a
-- weakness note, on top of the existing student_day_blocks.done. Feeds the
-- exam-readiness percentage shown on the student dashboard and in the
-- teacher's per-student report. Manual apply required (Supabase console).

alter table student_day_blocks
  add column if not exists concept_done boolean not null default false,
  add column if not exists practice_done boolean not null default false,
  add column if not exists assessment_done boolean not null default false,
  add column if not exists weakness_note text null;
