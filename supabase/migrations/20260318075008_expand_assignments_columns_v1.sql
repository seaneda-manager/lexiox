-- supabase/migrations/20260318_expand_assignments_columns_v1.sql

alter table public.assignments
  add column if not exists kind text,
  add column if not exists track text,
  add column if not exists section text,
  add column if not exists target_type text,
  add column if not exists due_date date,
  add column if not exists status text default 'draft',
  add column if not exists updated_at timestamptz default now();

update public.assignments
set updated_at = now()
where updated_at is null;
