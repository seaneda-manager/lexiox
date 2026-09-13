-- Typing practice (LXGym "타자 암기 스피드 훈련") — Phase 1
-- Manual apply required (Supabase console) — CLI migrations have repeatedly failed on this project.

create table if not exists public.typing_practice_content (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('manual', 'reading_passage', 'listening_transcript')),
  source_ref text null, -- e.g. "reading_passages:<id>" when copied from an existing passage
  title text not null,
  body_en text not null,
  body_ko text null,
  tags text[] not null default '{}',
  difficulty text null,
  created_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists typing_practice_content_source_type_idx
  on public.typing_practice_content (source_type);

create table if not exists public.typing_practice_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null,
  content_id uuid null references public.typing_practice_content (id) on delete set null,
  content_source text not null check (content_source in ('vocab', 'content')),
  reveal_mode text not null check (reveal_mode in ('full', 'partial', 'blind')),
  shuffled boolean not null default false,
  strict boolean not null default false,
  wpm numeric not null default 0,
  accuracy numeric not null default 0,
  error_count integer not null default 0,
  duration_sec numeric not null default 0,
  weak_words text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists typing_practice_attempts_student_id_idx
  on public.typing_practice_attempts (student_id, created_at desc);

alter table public.typing_practice_content enable row level security;
alter table public.typing_practice_attempts enable row level security;

-- Content is admin-authored, readable by any authenticated user (students need it to play).
drop policy if exists typing_practice_content_read on public.typing_practice_content;
create policy typing_practice_content_read
  on public.typing_practice_content for select
  to authenticated
  using (true);

-- Writes go through the service-role API route only (no direct client insert/update/delete policy).

-- Students can read and insert their own attempts.
drop policy if exists typing_practice_attempts_read_own on public.typing_practice_attempts;
create policy typing_practice_attempts_read_own
  on public.typing_practice_attempts for select
  to authenticated
  using (student_id = auth.uid());

drop policy if exists typing_practice_attempts_insert_own on public.typing_practice_attempts;
create policy typing_practice_attempts_insert_own
  on public.typing_practice_attempts for insert
  to authenticated
  with check (student_id = auth.uid());
