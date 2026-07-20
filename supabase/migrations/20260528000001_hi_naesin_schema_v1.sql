-- supabase/migrations/20260528000001_hi_naesin_schema_v1.sql
-- 고등 내신 (hi_naesin) 핵심 스키마
-- 중학/JR naesin_reading_* 테이블과 완전 분리

-- ──────────────────────────────────────────
-- 1. 지문 (passages)
-- ──────────────────────────────────────────
create table if not exists public.hi_naesin_passages (
  id uuid primary key default gen_random_uuid(),

  -- 출처 분류
  source_type text not null check (source_type in ('mock_exam', 'textbook', 'external_book')),
  grade       text not null check (grade in ('H1', 'H2', 'H3')),

  -- 모의고사 전용
  exam_year       integer,   -- 예: 2025
  exam_month      integer,   -- 예: 9
  question_number integer,   -- 원문제 번호 (18번 등)

  -- 교과서 전용
  school_name   text,
  textbook_name text,
  unit_label    text,

  -- 외부교재 전용
  book_name text,
  book_unit text,

  -- 본문
  title          text,
  passage_text   text not null,
  translation_ko text,
  word_count     integer,

  -- 메타
  topic_tags   text[] not null default '{}'::text[],
  is_published boolean not null default false,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ──────────────────────────────────────────
-- 2. Drill 아이템
-- drill_type별 payload 구조:
--   translation    : { sentence_en, answer_ko }
--   fill_blank     : { sentence_template, answer, distractors[] }
--   writing        : { ko_prompt, answer_en, acceptable_answers[] }
--   summary        : { template, blanks[{answer, distractors[]}] }
--   grammar_choice : { sentence_template, option_a, option_b, correct, explanation }
-- ──────────────────────────────────────────
create table if not exists public.hi_naesin_drills (
  id          uuid primary key default gen_random_uuid(),
  passage_id  uuid not null references public.hi_naesin_passages(id) on delete cascade,
  drill_type  text not null check (drill_type in (
    'translation',
    'fill_blank',
    'writing',
    'summary',
    'grammar_choice'
  )),
  order_index  integer not null default 0,
  payload      jsonb not null default '{}'::jsonb,
  is_published boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint hi_naesin_drills_passage_order_unique unique (passage_id, drill_type, order_index)
);

-- ──────────────────────────────────────────
-- 3. 변형문제
-- question_type별 payload 구조:
--   text_ordering      : { fixed_segment, segments[{id,text}], correct_order[] }
--   blank_word         : { blank_position_hint }  → 보기는 choices 테이블
--   blank_sentence     : {}                        → 보기는 choices 테이블
--   irrelevant_sentence: { irrelevant_index, irrelevant_text }
--   summary_fill       : { template, blank_labels[] } → 보기는 choices 테이블
--   fact               : {}                        → 보기는 choices 테이블
--   negative_fact      : {}                        → 보기는 choices 테이블
-- ──────────────────────────────────────────
create table if not exists public.hi_naesin_variant_questions (
  id            uuid primary key default gen_random_uuid(),
  passage_id    uuid not null references public.hi_naesin_passages(id) on delete cascade,
  question_type text not null check (question_type in (
    'text_ordering',
    'blank_word',
    'blank_sentence',
    'irrelevant_sentence',
    'summary_fill',
    'fact',
    'negative_fact'
  )),
  order_index  integer not null default 0,
  stem         text,      -- 문제 지시문 (없으면 타입별 기본값 사용)
  payload      jsonb not null default '{}'::jsonb,
  explanation  text,
  is_published boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ──────────────────────────────────────────
-- 4. 변형문제 보기 (5지선다)
-- ──────────────────────────────────────────
create table if not exists public.hi_naesin_variant_choices (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.hi_naesin_variant_questions(id) on delete cascade,
  order_index integer not null check (order_index between 1 and 5),
  text        text not null,
  is_correct  boolean not null default false,
  created_at  timestamptz not null default now(),
  constraint hi_naesin_variant_choices_q_order_unique unique (question_id, order_index)
);

-- ──────────────────────────────────────────
-- 5. 과제 배정
-- ──────────────────────────────────────────
create table if not exists public.hi_naesin_assignments (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references auth.users(id) on delete cascade,
  passage_id      uuid not null references public.hi_naesin_passages(id) on delete cascade,
  assigned_by     uuid references auth.users(id) on delete set null,
  assignment_type text not null check (assignment_type in ('drill', 'variant', 'full')),
  status          text not null default 'assigned'
    check (status in ('assigned', 'started', 'submitted', 'reviewed')),
  due_at     timestamptz,
  note       text,
  assigned_at timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ──────────────────────────────────────────
-- 6. 학습 세션
-- ──────────────────────────────────────────
create table if not exists public.hi_naesin_sessions (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references auth.users(id) on delete cascade,
  passage_id   uuid not null references public.hi_naesin_passages(id) on delete cascade,
  assignment_id uuid references public.hi_naesin_assignments(id) on delete set null,
  session_type text not null check (session_type in ('drill', 'variant', 'full')),
  status       text not null default 'started'
    check (status in ('started', 'submitted', 'reviewed')),
  started_at    timestamptz not null default now(),
  submitted_at  timestamptz,
  score_percent numeric(5,1),
  analytics_snapshot jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ──────────────────────────────────────────
-- 7. Drill 응답
-- ──────────────────────────────────────────
create table if not exists public.hi_naesin_drill_responses (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references public.hi_naesin_sessions(id) on delete cascade,
  drill_id        uuid not null references public.hi_naesin_drills(id) on delete cascade,
  response_text   text,      -- translation, writing, fill_blank, summary
  response_choice text,      -- grammar_choice: 'a' | 'b'
  is_correct      boolean,
  elapsed_sec     integer,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint hi_naesin_drill_responses_session_drill_unique unique (session_id, drill_id)
);

-- ──────────────────────────────────────────
-- 8. 변형문제 응답
-- ──────────────────────────────────────────
create table if not exists public.hi_naesin_variant_answers (
  id                 uuid primary key default gen_random_uuid(),
  session_id         uuid not null references public.hi_naesin_sessions(id) on delete cascade,
  question_id        uuid not null references public.hi_naesin_variant_questions(id) on delete cascade,
  selected_choice_id uuid references public.hi_naesin_variant_choices(id) on delete set null,
  selected_order     text[],  -- text_ordering용
  is_correct         boolean not null,
  elapsed_sec        integer,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint hi_naesin_variant_answers_session_q_unique unique (session_id, question_id)
);

-- ──────────────────────────────────────────
-- Indexes
-- ──────────────────────────────────────────
create index if not exists idx_hi_naesin_passages_source_type on public.hi_naesin_passages (source_type);
create index if not exists idx_hi_naesin_passages_grade       on public.hi_naesin_passages (grade);
create index if not exists idx_hi_naesin_passages_published   on public.hi_naesin_passages (is_published);
create index if not exists idx_hi_naesin_passages_school      on public.hi_naesin_passages (school_name);

create index if not exists idx_hi_naesin_drills_passage_id   on public.hi_naesin_drills (passage_id);
create index if not exists idx_hi_naesin_drills_type         on public.hi_naesin_drills (drill_type);

create index if not exists idx_hi_naesin_variant_q_passage   on public.hi_naesin_variant_questions (passage_id);
create index if not exists idx_hi_naesin_variant_q_type      on public.hi_naesin_variant_questions (question_type);
create index if not exists idx_hi_naesin_variant_choices_q   on public.hi_naesin_variant_choices (question_id);

create index if not exists idx_hi_naesin_assignments_student on public.hi_naesin_assignments (student_id);
create index if not exists idx_hi_naesin_assignments_passage on public.hi_naesin_assignments (passage_id);
create index if not exists idx_hi_naesin_assignments_status  on public.hi_naesin_assignments (status);

create index if not exists idx_hi_naesin_sessions_student    on public.hi_naesin_sessions (student_id);
create index if not exists idx_hi_naesin_sessions_passage    on public.hi_naesin_sessions (passage_id);
create index if not exists idx_hi_naesin_sessions_status     on public.hi_naesin_sessions (status);

create index if not exists idx_hi_naesin_drill_resp_session  on public.hi_naesin_drill_responses (session_id);
create index if not exists idx_hi_naesin_variant_ans_session on public.hi_naesin_variant_answers (session_id);

-- ──────────────────────────────────────────
-- updated_at 트리거
-- ──────────────────────────────────────────
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'hi_naesin_passages',
    'hi_naesin_drills',
    'hi_naesin_variant_questions',
    'hi_naesin_assignments',
    'hi_naesin_sessions',
    'hi_naesin_drill_responses',
    'hi_naesin_variant_answers'
  ]
  loop
    execute format(
      'drop trigger if exists trg_%s_updated_at on public.%s;
       create trigger trg_%s_updated_at
       before update on public.%s
       for each row execute function public.tg_set_updated_at();',
      t, t, t, t
    );
  end loop;
end
$$;
