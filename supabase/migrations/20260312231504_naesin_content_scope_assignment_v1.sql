create extension if not exists pgcrypto;

create table if not exists public.naesin_contents (
  id uuid primary key default gen_random_uuid(),

  track text not null default 'naesin',
  section text not null,
  school_level text not null,

  title text not null,
  source_type text not null,
  content_kind text not null,
  question_origin_type text null,

  source_book text null,
  publisher text null,
  grade text null,
  semester text null,
  unit text null,
  chapter text null,

  difficulty text null,
  tags text[] null,

  is_active boolean not null default true,

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

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.naesin_exam_scope_items (
  id uuid primary key default gen_random_uuid(),

  scope_id uuid not null references public.naesin_exam_scopes(id) on delete cascade,
  content_id uuid not null references public.naesin_contents(id) on delete cascade,

  sort_order int not null default 100,
  is_required boolean not null default true,
  note text null,

  created_at timestamptz not null default now()
);

create table if not exists public.naesin_assignments (
  id uuid primary key default gen_random_uuid(),

  target_type text not null,
  target_id uuid not null,

  scope_id uuid not null references public.naesin_exam_scopes(id) on delete cascade,
  title text not null,

  due_at timestamptz null,
  review_required boolean not null default true,
  retry_allowed boolean not null default true,

  status text not null default 'assigned',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_naesin_contents_section
  on public.naesin_contents (section);

create index if not exists idx_naesin_contents_school_level
  on public.naesin_contents (school_level);

create index if not exists idx_naesin_contents_source_type
  on public.naesin_contents (source_type);

create index if not exists idx_naesin_contents_question_origin_type
  on public.naesin_contents (question_origin_type);

create index if not exists idx_naesin_exam_scopes_school_name
  on public.naesin_exam_scopes (school_name);

create index if not exists idx_naesin_exam_scopes_exam_type
  on public.naesin_exam_scopes (exam_type);

create index if not exists idx_naesin_exam_scope_items_scope_id
  on public.naesin_exam_scope_items (scope_id);

create index if not exists idx_naesin_exam_scope_items_content_id
  on public.naesin_exam_scope_items (content_id);

create index if not exists idx_naesin_assignments_scope_id
  on public.naesin_assignments (scope_id);

create index if not exists idx_naesin_assignments_target
  on public.naesin_assignments (target_type, target_id);

create index if not exists idx_naesin_assignments_status
  on public.naesin_assignments (status);
