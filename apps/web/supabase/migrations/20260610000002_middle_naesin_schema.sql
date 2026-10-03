-- Middle school naesin content schema

-- Units: one row per textbook unit (e.g. "천재(이재영) 중2 1학기 Lesson 3")
create table if not exists public.middle_naesin_units (
  id            uuid primary key default gen_random_uuid(),
  school_name   text,                          -- 학교명 (선택)
  publisher     text not null,                 -- 출판사/저자 예: 천재(이재영)
  grade         text not null check (grade in ('M1', 'M2', 'M3')),
  semester      smallint not null check (semester in (1, 2)),
  lesson_number smallint,                      -- 단원 번호
  lesson_title  text,                          -- 단원명 예: "Be Yourself"
  is_published  boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Contents: multiple content pieces per unit
create table if not exists public.middle_naesin_contents (
  id           uuid primary key default gen_random_uuid(),
  unit_id      uuid not null references public.middle_naesin_units(id) on delete cascade,
  content_type text not null check (content_type in (
    'main_text',    -- 교과서 본문
    'dialogue',     -- 대화문
    'more_reading', -- More Reading
    'vocab_en_en',  -- 영영 단어
    'past_exam'     -- 기출문제 분석
  )),
  title        text,
  body_text    text,                           -- 지문/내용 원문
  translation_ko text,                         -- 한국어 해석
  extra_data   jsonb,                          -- 영영단어: [{word, definition, example}], 기출: [{year, question, answer}]
  sort_order   smallint not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Indexes
create index if not exists idx_middle_naesin_units_grade     on public.middle_naesin_units (grade);
create index if not exists idx_middle_naesin_units_publisher on public.middle_naesin_units (publisher);
create index if not exists idx_middle_naesin_contents_unit   on public.middle_naesin_contents (unit_id);
create index if not exists idx_middle_naesin_contents_type   on public.middle_naesin_contents (content_type);

-- RLS
alter table public.middle_naesin_units     enable row level security;
alter table public.middle_naesin_contents  enable row level security;

drop policy if exists "open" on public.middle_naesin_units;
create policy "open" on public.middle_naesin_units    for all using (true) with check (true);
drop policy if exists "open" on public.middle_naesin_contents;
create policy "open" on public.middle_naesin_contents for all using (true) with check (true);

-- updated_at trigger helper (reuse if exists)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists trg_middle_naesin_units_updated_at on public.middle_naesin_units;
create trigger trg_middle_naesin_units_updated_at
  before update on public.middle_naesin_units
  for each row execute function public.set_updated_at();

drop trigger if exists trg_middle_naesin_contents_updated_at on public.middle_naesin_contents;
create trigger trg_middle_naesin_contents_updated_at
  before update on public.middle_naesin_contents
  for each row execute function public.set_updated_at();
