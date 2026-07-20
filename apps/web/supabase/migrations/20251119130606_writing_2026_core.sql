-- 2026 Writing core tables

-- 세션 테이블
create table if not exists public.writing_2026_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  test_id text not null,
  status text not null default 'completed',
  raw_answers jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.writing_2026_sessions enable row level security;

create policy "writing_2026_sessions_select_own"
  on public.writing_2026_sessions
  for select
  using (auth.uid() = user_id);

create policy "writing_2026_sessions_insert_own"
  on public.writing_2026_sessions
  for insert
  with check (auth.uid() = user_id);
