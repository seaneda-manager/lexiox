-- Updated TOEFL Reading SSOT v1
-- 2026-03-02

-- ===== ENUMS =====
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

-- ===== CONTENT =====

create table if not exists public.reading_passages (
  id uuid primary key default gen_random_uuid(),
  task_type public.reading_task_type not null,
  title text not null default '',
  body text not null,
  word_count int not null default 0,
  daily_format public.reading_daily_format,
  topic text,
  created_at timestamptz not null default now()
);

create index if not exists idx_reading_passages_task_type on public.reading_passages(task_type);

create table if not exists public.reading_questions (
  id uuid primary key default gen_random_uuid(),
  passage_id uuid not null references public.reading_passages(id) on delete cascade,

  task_type public.reading_task_type not null,
  subtype public.reading_academic_subtype, -- only for ACADEMIC
  difficulty_tier public.reading_difficulty_tier not null default 'MEDIUM',

  prompt text not null,
  choice_a text not null,
  choice_b text not null,
  choice_c text not null,
  choice_d text not null,
  correct_choice public.reading_choice not null,

  explanation text,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_reading_questions_passage_id on public.reading_questions(passage_id);
create index if not exists idx_reading_questions_task_type on public.reading_questions(task_type);
create index if not exists idx_reading_questions_subtype on public.reading_questions(subtype);

-- Optional meta table (for highlights, glossary, etc.)
create table if not exists public.reading_question_meta (
  question_id uuid primary key references public.reading_questions(id) on delete cascade,
  target_span jsonb,     -- e.g. { "start": 120, "end": 180 } or richer
  glossary jsonb         -- e.g. [{term, definition, start, end}]
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
  branch public.reading_branch not null, -- ROUTING/LOWER/HIGHER

  ctw_count int not null default 0,
  daily_count int not null default 0,
  academic_count int not null default 0,

  created_at timestamptz not null default now(),
  unique(test_id, module_no, branch)
);

create index if not exists idx_reading_module_defs_test on public.reading_module_defs(test_id);

create table if not exists public.reading_module_items (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.reading_module_defs(id) on delete cascade,
  question_id uuid not null references public.reading_questions(id) on delete restrict,
  position int not null,
  unique(module_id, position),
  unique(module_id, question_id)
);

create index if not exists idx_reading_module_items_module on public.reading_module_items(module_id);

-- ===== ATTEMPTS / ANSWERS =====

create table if not exists public.reading_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  test_id uuid not null references public.reading_test_defs(id) on delete restrict,

  started_at timestamptz not null default now(),
  finished_at timestamptz,

  routing_m1 float8,
  branch_taken public.reading_branch, -- LOWER/HIGHER
  m2_score float8,
  m2_bonus float8,
  theta float8,
  scaled_score int,

  created_at timestamptz not null default now()
);

create index if not exists idx_reading_attempts_user on public.reading_attempts(user_id);
create index if not exists idx_reading_attempts_test on public.reading_attempts(test_id);

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

create index if not exists idx_reading_attempt_answers_attempt on public.reading_attempt_answers(attempt_id);
create index if not exists idx_reading_attempt_answers_q on public.reading_attempt_answers(question_id);

-- ===== Minimal RLS suggestion (optional) =====
-- (Enable when you're ready; keeping off by default so you can wire quickly.)
-- alter table public.reading_attempts enable row level security;
-- alter table public.reading_attempt_answers enable row level security;