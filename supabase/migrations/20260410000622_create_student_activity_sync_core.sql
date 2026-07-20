-- supabase/migrations/20260410_create_student_activity_sync_core.sql
-- Step 6-1: Platform-wide sync foundation
-- Creates:
--   1) student_activities
--   2) student_activity_weak_tags
--   3) student_prescriptions
-- Plus updated_at trigger helpers and indexes

begin;

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.student_activities (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null,
  activity_type text not null,
  track text not null,
  section text null,
  status text not null default 'todo',
  source_table text null,
  source_id text null,
  title text null,
  description text null,
  score numeric null,
  accuracy numeric null,
  started_at timestamptz null,
  completed_at timestamptz null,
  due_at timestamptz null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint student_activities_activity_type_check
    check (activity_type in ('assignment','reading_session','vocab_session','review','homework')),

  constraint student_activities_track_check
    check (track in ('naesin','junior','toefl','voca')),

  constraint student_activities_status_check
    check (status in ('todo','in_progress','done','skipped','archived'))
);

create index if not exists idx_student_activities_student_id
  on public.student_activities(student_id);

create index if not exists idx_student_activities_student_status
  on public.student_activities(student_id, status);

create index if not exists idx_student_activities_student_track
  on public.student_activities(student_id, track);

create index if not exists idx_student_activities_student_created_at
  on public.student_activities(student_id, created_at desc);

create index if not exists idx_student_activities_due_at
  on public.student_activities(student_id, due_at);

create index if not exists idx_student_activities_source
  on public.student_activities(source_table, source_id);

create unique index if not exists uq_student_activities_source_unique
  on public.student_activities(student_id, activity_type, source_table, source_id)
  where source_table is not null and source_id is not null;

drop trigger if exists trg_student_activities_updated_at on public.student_activities;
create trigger trg_student_activities_updated_at
before update on public.student_activities
for each row
execute function public.set_updated_at();

create table if not exists public.student_activity_weak_tags (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.student_activities(id) on delete cascade,
  student_id uuid not null,
  weak_tag text not null,
  severity text null,
  source text null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),

  constraint student_activity_weak_tags_severity_check
    check (severity is null or severity in ('low','medium','high'))
);

create index if not exists idx_student_activity_weak_tags_student_id
  on public.student_activity_weak_tags(student_id);

create index if not exists idx_student_activity_weak_tags_activity_id
  on public.student_activity_weak_tags(activity_id);

create index if not exists idx_student_activity_weak_tags_tag
  on public.student_activity_weak_tags(weak_tag);

create index if not exists idx_student_activity_weak_tags_student_tag
  on public.student_activity_weak_tags(student_id, weak_tag);

create unique index if not exists uq_student_activity_weak_tags_once
  on public.student_activity_weak_tags(activity_id, weak_tag);

create table if not exists public.student_prescriptions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null,
  activity_id uuid null references public.student_activities(id) on delete set null,
  weak_tag text not null,
  prescription_type text not null,
  status text not null default 'queued',
  title text null,
  payload jsonb not null default '{}'::jsonb,
  due_at timestamptz null,
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint student_prescriptions_status_check
    check (status in ('queued','assigned','in_progress','done','cancelled'))
);

create index if not exists idx_student_prescriptions_student_id
  on public.student_prescriptions(student_id);

create index if not exists idx_student_prescriptions_status
  on public.student_prescriptions(student_id, status);

create index if not exists idx_student_prescriptions_weak_tag
  on public.student_prescriptions(weak_tag);

create index if not exists idx_student_prescriptions_created_at
  on public.student_prescriptions(student_id, created_at desc);

drop trigger if exists trg_student_prescriptions_updated_at on public.student_prescriptions;
create trigger trg_student_prescriptions_updated_at
before update on public.student_prescriptions
for each row
execute function public.set_updated_at();

commit;
