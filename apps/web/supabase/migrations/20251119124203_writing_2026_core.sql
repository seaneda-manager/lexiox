-- 2026 Writing 연습 세션 테이블 (MVP용)
-- 이미 수동으로 만든 테이블이 있어도 에러 안 나게 IF NOT EXISTS 사용

create table if not exists public.writing_2026_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- 진행 상태: in_progress / finished 등
  status text not null default 'in_progress',

  -- 나중에 채점 결과 저장용 (지금은 null이어도 됨)
  micro_score int,
  email_score int,
  academic_score int,
  total_score int,

  -- WritingRunner2026에서 쓰는 answers 객체를 그대로 저장
  -- 예: { "p1": "...", "email-w1": "...", "acad-a1": "..." }
  raw_answers jsonb
);

create index if not exists idx_writing_2026_sessions_user
  on public.writing_2026_sessions (user_id);
