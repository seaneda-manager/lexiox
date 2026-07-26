-- writing_tests와 writing_2026_sessions도 listening_tests/speaking_tests와 같은 문제:
-- 두 개의 서로 다른 CREATE TABLE IF NOT EXISTS 마이그레이션이 존재하고,
-- 실제 운영 DB에는 더 단순한 스키마(apps/web/supabase/migrations 쪽)가 적용되어
-- payload/exam_era, 그리고 채점/리비전 관련 컬럼들이 다수 누락되어 있었다.

alter table if exists public.writing_tests
  add column if not exists exam_era text not null default 'updated';
alter table if exists public.writing_tests
  add column if not exists payload jsonb not null default '{}';
alter table if exists public.writing_tests
  add column if not exists is_active boolean not null default true;

alter table if exists public.writing_2026_sessions
  add column if not exists updated_at timestamptz not null default now();
alter table if exists public.writing_2026_sessions
  add column if not exists grading_status text not null default 'ungraded';
alter table if exists public.writing_2026_sessions
  add column if not exists ai_email_score int;
alter table if exists public.writing_2026_sessions
  add column if not exists ai_discussion_score int;
alter table if exists public.writing_2026_sessions
  add column if not exists ai_total_score int;
alter table if exists public.writing_2026_sessions
  add column if not exists ai_grade_feedback text;
alter table if exists public.writing_2026_sessions
  add column if not exists ai_graded_at timestamptz;
alter table if exists public.writing_2026_sessions
  add column if not exists final_email_score int;
alter table if exists public.writing_2026_sessions
  add column if not exists final_discussion_score int;
alter table if exists public.writing_2026_sessions
  add column if not exists final_total_score int;
alter table if exists public.writing_2026_sessions
  add column if not exists final_grade_feedback text;
alter table if exists public.writing_2026_sessions
  add column if not exists graded_at timestamptz;
alter table if exists public.writing_2026_sessions
  add column if not exists parent_session_id uuid references public.writing_2026_sessions(id) on delete set null;
