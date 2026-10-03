create table if not exists public.speaking_tests (
  id          uuid primary key default gen_random_uuid(),
  label       text not null default '',
  exam_era    text not null default 'updated',
  payload     jsonb not null default '{}',
  is_locked   boolean not null default false,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create or replace function public.set_speaking_tests_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists speaking_tests_updated_at on public.speaking_tests;
create trigger speaking_tests_updated_at
  before update on public.speaking_tests
  for each row execute function public.set_speaking_tests_updated_at();

alter table public.speaking_tests enable row level security;

drop policy if exists "speaking_tests_read" on public.speaking_tests;
create policy "speaking_tests_read" on public.speaking_tests
  for select to authenticated using (true);

drop policy if exists "speaking_tests_service_all" on public.speaking_tests;
create policy "speaking_tests_service_all" on public.speaking_tests
  for all to service_role using (true) with check (true);
