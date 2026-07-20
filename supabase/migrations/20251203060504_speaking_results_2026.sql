-- supabase/migrations/2025_12_03_000001_speaking_results_2026.sql

create table if not exists public.speaking_results_2026 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,

  -- 어떤 세트/테스트인지
  test_id text not null,
  task_id text not null, -- 예: "task1", "task2", "task3"

  -- 스피킹 답변 본문 (AI STT 전에는 학생이 직접 입력한 텍스트 or 임시 스크립트)
  script text not null,

  -- 자동 채점/분석용 필드들 (처음엔 null로 두고 나중에 채워도 됨)
  approx_sentences integer,
  approx_words integer,
  fluency_score numeric,      -- 0~4 또는 0~30 등 스케일은 나중에 합의
  content_score numeric,
  language_score numeric,
  pronunciation_score numeric,

  -- 원래 프롬프트, 참고용
  prompt text,
  mode text,                  -- 예: "study" | "test" | "homework" | "task1_demo"
  meta jsonb default '{}'::jsonb,

  created_at timestamptz not null default now()
);

comment on table public.speaking_results_2026 is
  'TOEFL iBT 2026 스피킹(Task 1/2/3) 결과 저장 테이블. 학생 script, 간단 분석, 메타 정보 저장.';

create index if not exists idx_speaking_results_2026_user_id
  on public.speaking_results_2026 (user_id);

create index if not exists idx_speaking_results_2026_test_task
  on public.speaking_results_2026 (test_id, task_id, created_at desc);
