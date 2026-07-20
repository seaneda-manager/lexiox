-- 필요한 확장 (있으면 스킵)
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- listening_sessions 테이블에 plays 컬럼 보장
alter table public.listening_sessions
  add column if not exists plays integer not null default 0;

-- updated_at 컬럼도 보장(있으면 스킵)
alter table public.listening_sessions
  add column if not exists updated_at timestamptz not null default now();

-- updated_at 자동 갱신 트리거(있으면 교체)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  NEW.updated_at = now();
  return NEW;
end $$;

drop trigger if exists trg_listening_sessions_updated_at on public.listening_sessions;
create trigger trg_listening_sessions_updated_at
before update on public.listening_sessions
for each row execute function public.set_updated_at();

-- 재생수 증가 RPC (있으면 교체)
create or replace function public.inc_listening_plays(_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.listening_sessions
  set plays = coalesce(plays, 0) + 1
  where id = _id;
$$;

grant execute on function public.inc_listening_plays(uuid) to anon, authenticated, service_role;

-- 필요한 확장 (있으면 스킵)
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- listening_sessions에 plays/updated_at 보장
alter table public.listening_sessions
  add column if not exists plays integer not null default 0;

alter table public.listening_sessions
  add column if not exists updated_at timestamptz not null default now();

-- updated_at 자동 갱신 트리거
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  NEW.updated_at = now();
  return NEW;
end $$;

drop trigger if exists trg_listening_sessions_updated_at on public.listening_sessions;
create trigger trg_listening_sessions_updated_at
before update on public.listening_sessions
for each row execute function public.set_updated_at();

-- 재생수 증가 RPC
create or replace function public.inc_listening_plays(_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.listening_sessions
  set plays = coalesce(plays, 0) + 1
  where id = _id;
$$;

grant execute on function public.inc_listening_plays(uuid) to anon, authenticated, service_role;
