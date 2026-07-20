-- supabase/migrations/20260305100000_reading_sessions_answers_wireup.sql
-- 목적: 기존 테이블(reading_sessions, reading_answers)을 "TEST/REVIEW 엔진"에 맞게 확장(추가만)

-- 1) reading_sessions에 필요한 컬럼이 없으면 추가
alter table public.reading_sessions
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.reading_sessions
  add column if not exists set_id text;

alter table public.reading_sessions
  add column if not exists passage_id uuid references public.reading_passages(id) on delete set null;

alter table public.reading_sessions
  add column if not exists mode text default 'test';

alter table public.reading_sessions
  add column if not exists product text;

alter table public.reading_sessions
  add column if not exists track text;

alter table public.reading_sessions
  add column if not exists profile_id text;

alter table public.reading_sessions
  add column if not exists started_at timestamptz default now();

alter table public.reading_sessions
  add column if not exists finished_at timestamptz;

create index if not exists idx_reading_sessions_user_started
  on public.reading_sessions (user_id, started_at desc);

create index if not exists idx_reading_sessions_set
  on public.reading_sessions (set_id);

create index if not exists idx_reading_sessions_passage
  on public.reading_sessions (passage_id);

-- 2) reading_answers에 필요한 컬럼이 없으면 추가
alter table public.reading_answers
  add column if not exists session_id uuid references public.reading_sessions(id) on delete cascade;

alter table public.reading_answers
  add column if not exists question_id uuid references public.reading_questions(id) on delete cascade;

alter table public.reading_answers
  add column if not exists choice_id text;

alter table public.reading_answers
  add column if not exists elapsed_ms integer;

alter table public.reading_answers
  add column if not exists created_at timestamptz default now();

create index if not exists idx_reading_answers_session_created
  on public.reading_answers (session_id, created_at desc);

create index if not exists idx_reading_answers_session_question
  on public.reading_answers (session_id, question_id);

-- 3) RLS + 정책 (있으면 건드리지 않고, 없으면 추가)
alter table public.reading_sessions enable row level security;
alter table public.reading_answers enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='reading_sessions' and policyname='reading_sessions_select_own_v1'
  ) then
    execute $p$
      create policy reading_sessions_select_own_v1
      on public.reading_sessions
      for select
      to authenticated
      using (user_id = auth.uid())
    $p$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='reading_sessions' and policyname='reading_sessions_insert_own_v1'
  ) then
    execute $p$
      create policy reading_sessions_insert_own_v1
      on public.reading_sessions
      for insert
      to authenticated
      with check (user_id = auth.uid())
    $p$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='reading_sessions' and policyname='reading_sessions_update_own_v1'
  ) then
    execute $p$
      create policy reading_sessions_update_own_v1
      on public.reading_sessions
      for update
      to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid())
    $p$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='reading_answers' and policyname='reading_answers_select_own_v1'
  ) then
    execute $p$
      create policy reading_answers_select_own_v1
      on public.reading_answers
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.reading_sessions s
          where s.id = reading_answers.session_id
            and s.user_id = auth.uid()
        )
      )
    $p$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='reading_answers' and policyname='reading_answers_insert_own_v1'
  ) then
    execute $p$
      create policy reading_answers_insert_own_v1
      on public.reading_answers
      for insert
      to authenticated
      with check (
        exists (
          select 1
          from public.reading_sessions s
          where s.id = reading_answers.session_id
            and s.user_id = auth.uid()
        )
      )
    $p$;
  end if;
end $$;