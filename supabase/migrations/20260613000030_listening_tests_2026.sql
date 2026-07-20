-- listening_tests_2026: Updated TOEFL Listening 어댑티브 시험 패킷
-- payload = LListeningTest2026 JSON (Stage1/Stage2 모듈, 트랙별 스크립트+문제)

create table if not exists public.listening_tests_2026 (
  id          uuid primary key default gen_random_uuid(),
  label       text not null,
  exam_era    text not null default 'ibt_2026',
  payload     jsonb not null,
  is_locked   boolean not null default false,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_listening_tests_2026_updated_at
  on public.listening_tests_2026 (updated_at desc);

create or replace function public.set_listening_tests_2026_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists trg_listening_tests_2026_updated_at on public.listening_tests_2026;
create trigger trg_listening_tests_2026_updated_at
  before update on public.listening_tests_2026
  for each row execute function public.set_listening_tests_2026_updated_at();

alter table public.listening_tests_2026 enable row level security;

create policy "Authenticated users can read listening tests"
  on public.listening_tests_2026 for select
  to authenticated using (true);

create policy "Service role full access to listening tests"
  on public.listening_tests_2026 for all
  to service_role using (true) with check (true);
