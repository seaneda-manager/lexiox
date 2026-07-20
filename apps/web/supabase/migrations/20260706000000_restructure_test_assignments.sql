-- Create individual test tables for each skill
create table if not exists public.speaking_tests (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  description text,
  is_locked boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.listening_tests (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  description text,
  is_locked boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reading_tests (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  description text,
  is_locked boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.writing_tests (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  description text,
  is_locked boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add columns to test_assignments
alter table if exists public.test_assignments
add column if not exists speaking_test_id uuid references speaking_tests(id) on delete cascade;

alter table if exists public.test_assignments
add column if not exists listening_test_id uuid references listening_tests(id) on delete cascade;

alter table if exists public.test_assignments
add column if not exists reading_test_id uuid references reading_tests(id) on delete cascade;

alter table if exists public.test_assignments
add column if not exists writing_test_id uuid references writing_tests(id) on delete cascade;

alter table if exists public.test_assignments
add column if not exists assigned_by uuid;

alter table if exists public.test_assignments
add column if not exists sections text[] default '{}';

alter table if exists public.test_assignments
add column if not exists due_date timestamptz;

alter table if exists public.test_assignments
add column if not exists assigned_at timestamptz default now();

alter table if exists public.test_assignments
add column if not exists started_at timestamptz;

alter table if exists public.test_assignments
add column if not exists completed_at timestamptz;

alter table if exists public.test_assignments
add column if not exists updated_at timestamptz default now();

-- Create indexes for performance
create index if not exists test_assignments_speaking_test_id_idx on test_assignments(speaking_test_id);
create index if not exists test_assignments_listening_test_id_idx on test_assignments(listening_test_id);
create index if not exists test_assignments_reading_test_id_idx on test_assignments(reading_test_id);
create index if not exists test_assignments_writing_test_id_idx on test_assignments(writing_test_id);
create index if not exists test_assignments_assigned_by_idx on test_assignments(assigned_by);
create index if not exists test_assignments_student_id_idx on test_assignments(student_id);
