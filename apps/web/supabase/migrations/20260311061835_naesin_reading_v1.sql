-- supabase/migrations/20260311_naesin_reading_v1.sql

create extension if not exists pgcrypto;

create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'naesin_reading_source_type'
  ) then
    create type public.naesin_reading_source_type as enum (
      'school_exam',
      'mock_exam',
      'textbook',
      'academy_original',
      'worksheet',
      'ebs_like'
    );
  end if;

  if not exists (
    select 1 from pg_type where typname = 'naesin_grade_band'
  ) then
    create type public.naesin_grade_band as enum (
      'ELEM',
      'M1',
      'M2',
      'M3',
      'H1',
      'H2',
      'H3'
    );
  end if;

  if not exists (
    select 1 from pg_type where typname = 'naesin_reading_difficulty'
  ) then
    create type public.naesin_reading_difficulty as enum (
      'foundation',
      'basic',
      'standard',
      'advanced',
      'challenge'
    );
  end if;

  if not exists (
    select 1 from pg_type where typname = 'naesin_exam_context'
  ) then
    create type public.naesin_exam_context as enum (
      'midterm',
      'final',
      'monthly_mock',
      'csat_like',
      'homework',
      'clinic'
    );
  end if;

  if not exists (
    select 1 from pg_type where typname = 'naesin_passage_genre'
  ) then
    create type public.naesin_passage_genre as enum (
      'narrative',
      'expository',
      'argumentative',
      'dialogue',
      'notice',
      'email',
      'ad',
      'chart_based',
      'hybrid'
    );
  end if;

  if not exists (
    select 1 from pg_type where typname = 'naesin_question_type'
  ) then
    create type public.naesin_question_type as enum (
      'main_idea',
      'title',
      'purpose',
      'tone',
      'detail',
      'not_true',
      'inference',
      'vocab_in_context',
      'reference',
      'blank',
      'sentence_insertion',
      'order',
      'summary',
      'topic_sentence',
      'grammar_in_context',
      'phrase_meaning',
      'author_claim',
      'matching',
      'chart_interpretation'
    );
  end if;

  if not exists (
    select 1 from pg_type where typname = 'naesin_evidence_type'
  ) then
    create type public.naesin_evidence_type as enum (
      'sentence',
      'span',
      'paragraph',
      'logic'
    );
  end if;

  if not exists (
    select 1 from pg_type where typname = 'naesin_session_status'
  ) then
    create type public.naesin_session_status as enum (
      'assigned',
      'started',
      'submitted',
      'reviewed'
    );
  end if;

  if not exists (
    select 1 from pg_type where typname = 'naesin_session_mode'
  ) then
    create type public.naesin_session_mode as enum (
      'practice',
      'test',
      'review',
      'clinic'
    );
  end if;

  if not exists (
    select 1 from pg_type where typname = 'naesin_wrong_reason_tag'
  ) then
    create type public.naesin_wrong_reason_tag as enum (
      'misread_sentence',
      'missed_keyword',
      'vocab_unknown',
      'grammar_confusion',
      'logic_confusion',
      'careless',
      'time_pressure',
      'guessed'
    );
  end if;

  if not exists (
    select 1 from pg_type where typname = 'naesin_prescription_tag'
  ) then
    create type public.naesin_prescription_tag as enum (
      'vocab_context_weak',
      'blank_logic_weak',
      'sentence_order_weak',
      'detail_accuracy_low',
      'slow_reader',
      'grammar_context_weak'
    );
  end if;
end
$$;

create table if not exists public.naesin_reading_sets (
  id uuid primary key default gen_random_uuid(),
  track text not null default 'lingo_x_naesin',
  curriculum_id text,
  title text not null,
  subtitle text,
  source_type public.naesin_reading_source_type not null,
  exam_context public.naesin_exam_context not null,
  grade_band public.naesin_grade_band not null,
  difficulty public.naesin_reading_difficulty not null,
  school_name text,
  semester text,
  book_name text,
  unit_range text,
  total_questions integer not null default 0 check (total_questions >= 0),
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes >= 0),
  tags text[] not null default '{}'::text[],
  is_published boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint naesin_reading_sets_track_check
    check (track = 'lingo_x_naesin')
);

create table if not exists public.naesin_reading_passages (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.naesin_reading_sets (id) on delete cascade,
  order_index integer not null check (order_index >= 0),
  title text,
  source_type public.naesin_reading_source_type not null,
  exam_context public.naesin_exam_context not null,
  grade_band public.naesin_grade_band not null,
  difficulty public.naesin_reading_difficulty not null,
  genre public.naesin_passage_genre not null,
  text text not null,
  translation_ko text,
  summary text,
  vocab_focus text[] not null default '{}'::text[],
  grammar_focus text[] not null default '{}'::text[],
  tags text[] not null default '{}'::text[],
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint naesin_reading_passages_set_order_unique unique (set_id, order_index)
);

create table if not exists public.naesin_reading_questions (
  id uuid primary key default gen_random_uuid(),
  passage_id uuid not null references public.naesin_reading_passages (id) on delete cascade,
  set_id uuid not null references public.naesin_reading_sets (id) on delete cascade,
  order_index integer not null check (order_index >= 0),
  number_label text not null,
  type public.naesin_question_type not null,
  stem text not null,
  prompt_ko text,
  answer_key jsonb not null,
  explanation text,
  skill_tags text[] not null default '{}'::text[],
  vocab_tags text[] not null default '{}'::text[],
  grammar_tags text[] not null default '{}'::text[],
  logic_tags text[] not null default '{}'::text[],
  difficulty public.naesin_reading_difficulty,
  score numeric(8,2) not null default 1 check (score > 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint naesin_reading_questions_passage_order_unique unique (passage_id, order_index),
  constraint naesin_reading_questions_set_number_unique unique (set_id, number_label)
);

create table if not exists public.naesin_reading_choices (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.naesin_reading_questions (id) on delete cascade,
  order_index integer not null check (order_index >= 0),
  label text not null,
  text text not null,
  is_correct boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint naesin_reading_choices_question_order_unique unique (question_id, order_index),
  constraint naesin_reading_choices_question_label_unique unique (question_id, label)
);

create table if not exists public.naesin_reading_evidence (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.naesin_reading_questions (id) on delete cascade,
  order_index integer not null default 0 check (order_index >= 0),
  type public.naesin_evidence_type not null,
  quote text,
  start_offset integer,
  end_offset integer,
  paragraph_label text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint naesin_reading_evidence_offsets_check
    check (
      (start_offset is null and end_offset is null)
      or
      (start_offset is not null and end_offset is not null and start_offset <= end_offset)
    ),
  constraint naesin_reading_evidence_question_order_unique unique (question_id, order_index)
);

create table if not exists public.student_naesin_reading_assignments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users (id) on delete cascade,
  set_id uuid not null references public.naesin_reading_sets (id) on delete cascade,
  assigned_by uuid references auth.users (id) on delete set null,
  status public.naesin_session_status not null default 'assigned',
  mode public.naesin_session_mode not null default 'practice',
  note text,
  due_at timestamptz,
  assigned_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.naesin_reading_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users (id) on delete cascade,
  assignment_id uuid references public.student_naesin_reading_assignments (id) on delete set null,
  set_id uuid not null references public.naesin_reading_sets (id) on delete cascade,
  status public.naesin_session_status not null default 'assigned',
  mode public.naesin_session_mode not null default 'practice',
  started_at timestamptz,
  submitted_at timestamptz,
  total_elapsed_sec integer check (total_elapsed_sec is null or total_elapsed_sec >= 0),
  score_raw numeric(8,2),
  score_percent numeric(5,1),
  band_label text,
  analytics_snapshot jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.naesin_reading_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.naesin_reading_sessions (id) on delete cascade,
  question_id uuid not null references public.naesin_reading_questions (id) on delete cascade,
  selected_choice_id uuid references public.naesin_reading_choices (id) on delete set null,
  selected_choice_ids uuid[] not null default '{}'::uuid[],
  answer_text text,
  ordered_values text[] not null default '{}'::text[],
  mapping_pairs jsonb not null default '{}'::jsonb,
  is_correct boolean not null,
  elapsed_sec integer check (elapsed_sec is null or elapsed_sec >= 0),
  confidence smallint check (confidence is null or confidence between 1 and 5),
  evidence_checked boolean not null default false,
  flagged boolean not null default false,
  wrong_reason_tags public.naesin_wrong_reason_tag[] not null default '{}'::public.naesin_wrong_reason_tag[],
  awarded_score numeric(8,2) not null default 0,
  max_score numeric(8,2) not null default 1,
  omitted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint naesin_reading_answers_session_question_unique unique (session_id, question_id)
);

create table if not exists public.naesin_reading_analytics_snapshots (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.naesin_reading_sessions (id) on delete cascade,
  accuracy_overall numeric(5,1) not null default 0,
  by_question_type jsonb not null default '{}'::jsonb,
  by_skill_group jsonb not null default '{}'::jsonb,
  by_passage jsonb not null default '{}'::jsonb,
  wrong_reason_breakdown jsonb not null default '{}'::jsonb,
  avg_elapsed_sec_by_type jsonb not null default '{}'::jsonb,
  prescription_tags public.naesin_prescription_tag[] not null default '{}'::public.naesin_prescription_tag[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_naesin_reading_sets_exam_context
  on public.naesin_reading_sets (exam_context);

create index if not exists idx_naesin_reading_sets_grade_band
  on public.naesin_reading_sets (grade_band);

create index if not exists idx_naesin_reading_sets_published
  on public.naesin_reading_sets (is_published);

create index if not exists idx_naesin_reading_passages_set_id
  on public.naesin_reading_passages (set_id);

create index if not exists idx_naesin_reading_questions_passage_id
  on public.naesin_reading_questions (passage_id);

create index if not exists idx_naesin_reading_questions_set_id
  on public.naesin_reading_questions (set_id);

create index if not exists idx_naesin_reading_questions_type
  on public.naesin_reading_questions (type);

create index if not exists idx_naesin_reading_choices_question_id
  on public.naesin_reading_choices (question_id);

create index if not exists idx_naesin_reading_evidence_question_id
  on public.naesin_reading_evidence (question_id);

create index if not exists idx_student_naesin_reading_assignments_student_id
  on public.student_naesin_reading_assignments (student_id);

create index if not exists idx_student_naesin_reading_assignments_set_id
  on public.student_naesin_reading_assignments (set_id);

create index if not exists idx_student_naesin_reading_assignments_status
  on public.student_naesin_reading_assignments (status);

create index if not exists idx_naesin_reading_sessions_student_id
  on public.naesin_reading_sessions (student_id);

create index if not exists idx_naesin_reading_sessions_set_id
  on public.naesin_reading_sessions (set_id);

create index if not exists idx_naesin_reading_sessions_assignment_id
  on public.naesin_reading_sessions (assignment_id);

create index if not exists idx_naesin_reading_sessions_status
  on public.naesin_reading_sessions (status);

create index if not exists idx_naesin_reading_sessions_mode
  on public.naesin_reading_sessions (mode);

create index if not exists idx_naesin_reading_answers_session_id
  on public.naesin_reading_answers (session_id);

create index if not exists idx_naesin_reading_answers_question_id
  on public.naesin_reading_answers (question_id);

create index if not exists idx_naesin_reading_answers_is_correct
  on public.naesin_reading_answers (is_correct);

drop trigger if exists trg_naesin_reading_sets_updated_at on public.naesin_reading_sets;
create trigger trg_naesin_reading_sets_updated_at
before update on public.naesin_reading_sets
for each row
execute function public.tg_set_updated_at();

drop trigger if exists trg_naesin_reading_passages_updated_at on public.naesin_reading_passages;
create trigger trg_naesin_reading_passages_updated_at
before update on public.naesin_reading_passages
for each row
execute function public.tg_set_updated_at();

drop trigger if exists trg_naesin_reading_questions_updated_at on public.naesin_reading_questions;
create trigger trg_naesin_reading_questions_updated_at
before update on public.naesin_reading_questions
for each row
execute function public.tg_set_updated_at();

drop trigger if exists trg_naesin_reading_choices_updated_at on public.naesin_reading_choices;
create trigger trg_naesin_reading_choices_updated_at
before update on public.naesin_reading_choices
for each row
execute function public.tg_set_updated_at();

drop trigger if exists trg_naesin_reading_evidence_updated_at on public.naesin_reading_evidence;
create trigger trg_naesin_reading_evidence_updated_at
before update on public.naesin_reading_evidence
for each row
execute function public.tg_set_updated_at();

drop trigger if exists trg_student_naesin_reading_assignments_updated_at on public.student_naesin_reading_assignments;
create trigger trg_student_naesin_reading_assignments_updated_at
before update on public.student_naesin_reading_assignments
for each row
execute function public.tg_set_updated_at();

drop trigger if exists trg_naesin_reading_sessions_updated_at on public.naesin_reading_sessions;
create trigger trg_naesin_reading_sessions_updated_at
before update on public.naesin_reading_sessions
for each row
execute function public.tg_set_updated_at();

drop trigger if exists trg_naesin_reading_answers_updated_at on public.naesin_reading_answers;
create trigger trg_naesin_reading_answers_updated_at
before update on public.naesin_reading_answers
for each row
execute function public.tg_set_updated_at();

drop trigger if exists trg_naesin_reading_analytics_snapshots_updated_at on public.naesin_reading_analytics_snapshots;
create trigger trg_naesin_reading_analytics_snapshots_updated_at
before update on public.naesin_reading_analytics_snapshots
for each row
execute function public.tg_set_updated_at();