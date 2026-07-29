-- Add scoring columns to writing_2026_answers for Band Score integration
-- This connects student answers directly to the grading system

alter table if exists public.writing_2026_answers
  add column if not exists final_email_score int;

alter table if exists public.writing_2026_answers
  add column if not exists final_discussion_score int;

alter table if exists public.writing_2026_answers
  add column if not exists final_total_score int;

alter table if exists public.writing_2026_answers
  add column if not exists final_grade_feedback text;

alter table if exists public.writing_2026_answers
  add column if not exists grading_status text not null default 'ungraded';

alter table if exists public.writing_2026_answers
  add column if not exists graded_at timestamptz;

-- Add index for status queries
create index if not exists idx_writing_2026_answers_grading_status
  on public.writing_2026_answers (grading_status);
