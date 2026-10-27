-- 문법 엔진 통합 P0: 개념 허브 + 교재/단원 + 레벨별 레슨 + 문항 + 학생 숙련도
-- additive only — 기존 테이블(grammar_2026_*, jr_grammar_chapters, middle_naesin_*)은 건드리지 않는다.
-- 설계: apps/web/docs/GRAMMAR_LEVELS_AND_SCHEMA_DESIGN.md
-- ⚠️ 수동 적용 (주말/저녁). 적용 후 seed: npx tsx scripts/grammar-toc/seed-grammar-engine.ts

-- ───────── 개념 허브 (교재/프로그램 중립) ─────────
create table if not exists public.grammar_concepts (
  id              uuid primary key default gen_random_uuid(),
  key             text not null unique,                       -- 'relative-object'
  title_ko        text not null,
  title_en        text not null,
  tier            smallint not null check (tier between 1 and 5),  -- 개념 자체 난이도
  difficulty_rank int not null,                               -- 전역 학습 순서
  category        text,                                       -- 챕터 그룹: '시제', '관계사' ...
  status          text not null default 'draft' check (status in ('draft', 'published')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_grammar_concepts_rank on public.grammar_concepts (difficulty_rank);

create table if not exists public.grammar_concept_links (
  concept_id uuid not null references public.grammar_concepts(id) on delete cascade,
  related_id uuid not null references public.grammar_concepts(id) on delete cascade,
  relation   text not null check (relation in ('contrast', 'prereq')),
  primary key (concept_id, related_id, relation),
  check (concept_id <> related_id)
);

-- ───────── 교재 / 단원 (목차) ─────────
create table if not exists public.grammar_books (
  id         uuid primary key default gen_random_uuid(),
  key        text not null unique,                            -- 'neuron-giche-middle3'
  title      text not null,
  publisher  text,
  grade      text,                                            -- 'M3' 등
  kind       text not null default 'external' check (kind in ('external', 'textbook', 'own')),
  created_at timestamptz not null default now()
);

create table if not exists public.grammar_book_units (
  id            uuid primary key default gen_random_uuid(),
  book_id       uuid not null references public.grammar_books(id) on delete cascade,
  chapter_no    smallint not null,
  chapter_title text not null,
  unit_no       smallint not null,
  title         text not null,
  page          int,
  sort_order    int not null,
  unique (book_id, chapter_no, unit_no)
);
create index if not exists idx_grammar_book_units_book on public.grammar_book_units (book_id, sort_order);

-- 단원 ↔ 개념 (N:N)
create table if not exists public.grammar_unit_concepts (
  unit_id      uuid not null references public.grammar_book_units(id) on delete cascade,
  concept_id   uuid not null references public.grammar_concepts(id) on delete cascade,
  taught_level smallint check (taught_level between 1 and 5),
  sort_order   int not null default 0,
  primary key (unit_id, concept_id)
);
create index if not exists idx_grammar_unit_concepts_concept on public.grammar_unit_concepts (concept_id);

-- ───────── 레벨별 레슨 (개념 × 레벨) ─────────
create table if not exists public.grammar_lessons (
  id          uuid primary key default gen_random_uuid(),
  concept_id  uuid not null references public.grammar_concepts(id) on delete cascade,
  level       smallint not null check (level between 1 and 5),
  status      text not null default 'draft' check (status in ('draft', 'final')),  -- 학생은 final만
  lesson      jsonb not null,                                 -- 기존 GrammarLesson 포맷 (models/middle-naesin/grammar-lesson.ts)
  source      text not null default 'ai' check (source in ('ai', 'manual', 'imported')),
  ai_review   jsonb,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (concept_id, level)
);

-- ───────── 문항 은행 (레슨 확정 시 lesson.questions 사본 동기화 + 직접 생성분) ─────────
create table if not exists public.grammar_items (
  id         uuid primary key default gen_random_uuid(),
  concept_id uuid not null references public.grammar_concepts(id) on delete cascade,
  level      smallint not null check (level between 1 and 5),
  lesson_id  uuid references public.grammar_lessons(id) on delete cascade,
  kind       text not null,                                   -- choice | fill | fix | count_wrong | reason | writing ...
  payload    jsonb not null,                                  -- 문제문·보기·정답·해설
  status     text not null default 'draft' check (status in ('draft', 'final')),
  source     text not null default 'ai' check (source in ('ai', 'manual', 'imported')),
  ai_review  jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_grammar_items_concept on public.grammar_items (concept_id, level, status);
create index if not exists idx_grammar_items_lesson on public.grammar_items (lesson_id);

-- ───────── 학생 (student_id = auth.users.id) ─────────
create table if not exists public.grammar_student_levels (
  student_id uuid primary key references auth.users(id) on delete cascade,
  level      smallint not null check (level between 1 and 5),
  set_by     text not null default 'teacher' check (set_by in ('teacher', 'placement', 'auto')),
  updated_at timestamptz not null default now()
);

create table if not exists public.grammar_mastery (
  student_id uuid not null references auth.users(id) on delete cascade,
  concept_id uuid not null references public.grammar_concepts(id) on delete cascade,
  level      smallint not null check (level between 1 and 5),
  attempts   int not null default 0,
  correct    int not null default 0,
  state      text not null default 'learning' check (state in ('learning', 'practicing', 'mastered')),
  last_at    timestamptz,
  primary key (student_id, concept_id, level)
);

create table if not exists public.grammar_responses (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  item_id    uuid not null references public.grammar_items(id) on delete cascade,
  answer     jsonb,
  is_correct boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_grammar_responses_student on public.grammar_responses (student_id, created_at desc);

-- ───────── RLS ─────────
alter table public.grammar_concepts       enable row level security;
alter table public.grammar_concept_links  enable row level security;
alter table public.grammar_books          enable row level security;
alter table public.grammar_book_units     enable row level security;
alter table public.grammar_unit_concepts  enable row level security;
alter table public.grammar_lessons        enable row level security;
alter table public.grammar_items          enable row level security;
alter table public.grammar_student_levels enable row level security;
alter table public.grammar_mastery        enable row level security;
alter table public.grammar_responses      enable row level security;

-- 목차/개념: 로그인 사용자 읽기, admin/producer 쓰기
do $$
declare t text;
begin
  foreach t in array array['grammar_concepts','grammar_concept_links','grammar_books','grammar_book_units','grammar_unit_concepts']
  loop
    execute format('drop policy if exists "%s_read" on public.%I', t, t);
    execute format('create policy "%s_read" on public.%I for select to authenticated using (true)', t, t);
    execute format('drop policy if exists "%s_write" on public.%I', t, t);
    execute format('create policy "%s_write" on public.%I for all to authenticated using (public.is_admin_or_producer(auth.uid())) with check (public.is_admin_or_producer(auth.uid()))', t, t);
  end loop;
end $$;

-- 레슨/문항: 학생은 final 만 읽기, admin/producer 는 전체 읽기·쓰기
drop policy if exists "grammar_lessons_read" on public.grammar_lessons;
create policy "grammar_lessons_read" on public.grammar_lessons for select to authenticated
  using (status = 'final' or public.is_admin_or_producer(auth.uid()));
drop policy if exists "grammar_lessons_write" on public.grammar_lessons;
create policy "grammar_lessons_write" on public.grammar_lessons for all to authenticated
  using (public.is_admin_or_producer(auth.uid())) with check (public.is_admin_or_producer(auth.uid()));

drop policy if exists "grammar_items_read" on public.grammar_items;
create policy "grammar_items_read" on public.grammar_items for select to authenticated
  using (status = 'final' or public.is_admin_or_producer(auth.uid()));
drop policy if exists "grammar_items_write" on public.grammar_items;
create policy "grammar_items_write" on public.grammar_items for all to authenticated
  using (public.is_admin_or_producer(auth.uid())) with check (public.is_admin_or_producer(auth.uid()));

-- 학생 데이터: 본인 것만 (admin/producer 는 읽기 허용, 선생님 조회는 서버(service role) 경유)
drop policy if exists "grammar_student_levels_read" on public.grammar_student_levels;
create policy "grammar_student_levels_read" on public.grammar_student_levels for select to authenticated
  using (auth.uid() = student_id or public.is_admin_or_producer(auth.uid()));
drop policy if exists "grammar_student_levels_write" on public.grammar_student_levels;
create policy "grammar_student_levels_write" on public.grammar_student_levels for all to authenticated
  using (public.is_admin_or_producer(auth.uid())) with check (public.is_admin_or_producer(auth.uid()));

drop policy if exists "grammar_mastery_own" on public.grammar_mastery;
create policy "grammar_mastery_own" on public.grammar_mastery for all to authenticated
  using (auth.uid() = student_id or public.is_admin_or_producer(auth.uid()))
  with check (auth.uid() = student_id or public.is_admin_or_producer(auth.uid()));

drop policy if exists "grammar_responses_read" on public.grammar_responses;
create policy "grammar_responses_read" on public.grammar_responses for select to authenticated
  using (auth.uid() = student_id or public.is_admin_or_producer(auth.uid()));
drop policy if exists "grammar_responses_insert" on public.grammar_responses;
create policy "grammar_responses_insert" on public.grammar_responses for insert to authenticated
  with check (auth.uid() = student_id);
