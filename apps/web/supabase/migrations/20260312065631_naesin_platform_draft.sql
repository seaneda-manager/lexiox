-- supabase/migrations/20260312_naesin_platform_draft.sql

create extension if not exists pgcrypto;

create table if not exists public.contents (
  id uuid primary key default gen_random_uuid(),
  track text not null,
  section text not null,
  school_level text null,
  title text not null,
  source_type text null,
  source_book text null,
  publisher text null,
  grade text null,
  semester text null,
  unit text null,
  chapter text null,
  difficulty text null,
  tags text[] null,
  status text not null default 'draft',
  is_school_specific boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.naesin_exam_scopes (
  id uuid primary key default gen_random_uuid(),
  school_level text not null,
  school_name text not null,
  academic_year int not null,
  grade text not null,
  semester text not null,
  exam_type text not null,
  title text not null,
  memo text null,
  start_date date null,
  end_date date null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.naesin_exam_scope_items (
  id uuid primary key default gen_random_uuid(),
  scope_id uuid not null references public.naesin_exam_scopes(id) on delete cascade,
  content_id uuid not null references public.contents(id) on delete cascade,
  sort_order int not null default 0,
  required boolean not null default true,
  note text null,
  created_at timestamptz not null default now()
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  track text not null,
  section text null,
  title text not null,
  target_type text not null,
  target_id uuid not null,
  content_id uuid null references public.contents(id) on delete set null,
  scope_id uuid null references public.naesin_exam_scopes(id) on delete set null,
  due_at timestamptz null,
  review_required boolean not null default true,
  retry_allowed boolean not null default true,
  status text not null default 'assigned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_parent_links (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null,
  parent_id uuid not null,
  relation text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.assignments
  add column if not exists kind text,
  add column if not exists track text,
  add column if not exists section text,
  add column if not exists target_type text,
  add column if not exists target_id uuid,
  add column if not exists content_id uuid references public.contents(id) on delete set null,
  add column if not exists scope_id uuid references public.naesin_exam_scopes(id) on delete set null,
  add column if not exists due_at timestamptz,
  add column if not exists review_required boolean not null default true,
  add column if not exists retry_allowed boolean not null default true,
  add column if not exists status text not null default 'assigned',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_contents_track_section
  on public.contents (track, section);

create index if not exists idx_contents_school_level
  on public.contents (school_level);

create index if not exists idx_contents_source_type
  on public.contents (source_type);

create index if not exists idx_naesin_exam_scopes_school_name
  on public.naesin_exam_scopes (school_name);

create index if not exists idx_naesin_exam_scopes_school_level_exam_type
  on public.naesin_exam_scopes (school_level, exam_type);

create index if not exists idx_naesin_exam_scope_items_scope_id
  on public.naesin_exam_scope_items (scope_id);

create index if not exists idx_assignments_track_kind
  on public.assignments (track, kind);

create index if not exists idx_assignments_target
  on public.assignments (target_type, target_id);

create index if not exists idx_student_parent_links_student_id
  on public.student_parent_links (student_id);

create index if not exists idx_student_parent_links_parent_id
  on public.student_parent_links (parent_id);
