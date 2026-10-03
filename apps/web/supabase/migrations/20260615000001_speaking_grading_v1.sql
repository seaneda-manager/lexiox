-- speaking_results_2026에 ETS rubric 채점 컬럼 추가
-- Delivery / Language Use / Topic Development (각 0~4)
-- AI 초안 + 선생님 최종 채점 분리

alter table public.speaking_results_2026
  add column if not exists audio_url         text,
  -- AI 채점 (초안)
  add column if not exists ai_delivery_score  numeric,   -- 0~4
  add column if not exists ai_language_score  numeric,   -- 0~4
  add column if not exists ai_topic_score     numeric,   -- 0~4
  add column if not exists ai_total_score     numeric,   -- 0~30 환산 (ETS 공식)
  add column if not exists ai_feedback        text,
  add column if not exists ai_graded_at       timestamptz,
  -- 선생님 최종 채점
  add column if not exists final_delivery_score  numeric,
  add column if not exists final_language_score  numeric,
  add column if not exists final_topic_score     numeric,
  add column if not exists final_total_score     numeric,
  add column if not exists final_feedback        text,
  add column if not exists graded_by             uuid references auth.users(id) on delete set null,
  add column if not exists graded_at             timestamptz,
  -- 채점 상태
  add column if not exists grading_status    text not null default 'ungraded';
  -- 'ungraded' | 'ai_graded' | 'teacher_graded'

-- 선생님이 채점 대기 중인 결과를 빠르게 조회하기 위한 인덱스
create index if not exists idx_speaking_results_2026_grading_status
  on public.speaking_results_2026 (grading_status, created_at desc);

-- RLS: 선생님/어드민이 모든 결과를 볼 수 있도록 (기존 정책에 추가)
-- (학생 본인 결과만 보는 정책은 기존 구조 유지)
