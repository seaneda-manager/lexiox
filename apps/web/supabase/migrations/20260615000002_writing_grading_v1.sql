-- writing_2026_sessions에 ETS rubric 채점 컬럼 추가
-- Email Writing + Academic Discussion 각 0~5점
-- AI 초안 + 선생님 최종 채점 분리

alter table public.writing_2026_sessions
  -- AI 채점 (초안)
  add column if not exists ai_email_score       numeric,   -- 0~5 (Email Writing / Integrated)
  add column if not exists ai_discussion_score  numeric,   -- 0~5 (Academic Discussion)
  add column if not exists ai_total_score       numeric,   -- 0~30 환산
  add column if not exists ai_grade_feedback    text,
  add column if not exists ai_graded_at         timestamptz,
  -- 선생님 최종 채점
  add column if not exists final_email_score       numeric,
  add column if not exists final_discussion_score  numeric,
  add column if not exists final_total_score       numeric,
  add column if not exists final_grade_feedback    text,
  add column if not exists graded_by               uuid references auth.users(id) on delete set null,
  add column if not exists graded_at               timestamptz,
  -- 채점 상태
  add column if not exists grading_status      text not null default 'ungraded';
  -- 'ungraded' | 'ai_graded' | 'teacher_graded'

create index if not exists idx_writing_2026_sessions_grading_status
  on public.writing_2026_sessions (grading_status, created_at desc);
