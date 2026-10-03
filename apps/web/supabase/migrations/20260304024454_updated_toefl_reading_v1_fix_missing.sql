-- Updated TOEFL Reading SSOT v1 - Fix missing enums + tables
-- 2026-03-04

create extension if not exists "pgcrypto";

-- ===== ENUMS (recreate if missing) =====
do $$ begin
  create type public.reading_task_type as enum ('CTW', 'DAILY', 'ACADEMIC');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.reading_daily_format as enum ('NOTICE', 'EMAIL', 'POST', 'SCHEDULE');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.reading_academic_subtype as enum (
    'MAIN_IDEA',
    'DETAIL',
    'NEGATIVE_FACT',
    'VOCAB_IN_CONTEXT',
    'INFERENCE',
    'PURPOSE'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.reading_difficulty_tier as enum ('EASY', 'MEDIUM', 'HARD');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.reading_branch as enum ('ROUTING', 'LOWER', 'HIGHER');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.reading_choice as enum ('A', 'B', 'C', 'D');
exception when duplicate_object then null; end $$;

-- ===== Missing META =====
create table if not exists public.reading_question_meta (
  question_id uuid primary key references public.reading_questions(id) on delete cascade,
  target_span jsonb,
  glossary jsonb
);

-- ===== TEST ASSEMBLY (MST) =====
create table if not exists public.reading_test_defs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_mst boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.reading_module_defs (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.reading_test_defs(id) on delete cascade,
  module_no int not null check (module_no in (1,2)),
  branch public.reading_branch not null,

  ctw_count int not null default 0,
  daily_count int not null default 0,
  academic_count int not null default 0,

  created_at timestamptz not null default now(),
  unique(test_id, module_no, branch)
);

create index if not exists idx_reading_module_defs_test
  on public.reading_module_defs(test_id);

create table if not exists public.reading_module_items (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.reading_module_defs(id) on delete cascade,
  question_id uuid not null references public.reading_questions(id) on delete restrict,
  position int not null,
  unique(module_id, position),
  unique(module_id, question_id)
);

create index if not exists idx_reading_module_items_module
  on public.reading_module_items(module_id);

-- ===== ATTEMPT ANSWERS =====
create table if not exists public.reading_attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.reading_attempts(id) on delete cascade,
  question_id uuid not null references public.reading_questions(id) on delete restrict,

  selected_choice public.reading_choice,
  is_correct boolean not null default false,
  time_spent_ms int,

  created_at timestamptz not null default now(),
  unique(attempt_id, question_id)
);

create index if not exists idx_reading_attempt_answers_attempt
  on public.reading_attempt_answers(attempt_id);

create index if not exists idx_reading_attempt_answers_q
  on public.reading_attempt_answers(question_id);