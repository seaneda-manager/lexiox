-- Updated Writing tests table
create table if not exists public.writing_tests (
  id          uuid primary key default gen_random_uuid(),
  label       text not null default '',
  exam_era    text not null default 'updated',
  payload     jsonb not null default '{}',
  is_locked   boolean not null default false,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- updated_at trigger
create or replace function public.set_writing_tests_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists writing_tests_updated_at on public.writing_tests;
create trigger writing_tests_updated_at
  before update on public.writing_tests
  for each row execute function public.set_writing_tests_updated_at();

-- RLS
alter table public.writing_tests enable row level security;

drop policy if exists "writing_tests_read" on public.writing_tests;
create policy "writing_tests_read" on public.writing_tests
  for select to authenticated using (true);

drop policy if exists "writing_tests_service_all" on public.writing_tests;
create policy "writing_tests_service_all" on public.writing_tests
  for all to service_role using (true) with check (true);
