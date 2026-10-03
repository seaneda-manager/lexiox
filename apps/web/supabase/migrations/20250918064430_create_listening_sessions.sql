-- 확장: gen_random_uuid() 사용
create extension if not exists pgcrypto;

-- 필요한 참조 테이블(최소 스켈레톤)
create table if not exists public.listening_passages (
  id uuid primary key default gen_random_uuid()
);

-- 메인 테이블 (없으면 생성)
create table if not exists public.listening_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  passage_id uuid not null references public.listening_passages(id) on delete cascade,
  mode text not null check (mode in ('test','study')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  plays int not null default 0,
  consumed boolean not null default false
);

-- ✅ 이미 존재하는 경우에도 컬럼 보장 (특히 plays)
alter table public.listening_sessions
  add column if not exists plays int not null default 0;

alter table public.listening_sessions
  add column if not exists consumed boolean not null default false;

-- RLS 활성화 (이미 활성화돼 있어도 문제 없음)
alter table public.listening_sessions enable row level security;

-- 정책 재정의(중복 방지)
drop policy if exists "ls_select_own" on public.listening_sessions;
drop policy if exists "ls_insert_own" on public.listening_sessions;
drop policy if exists "ls_update_own" on public.listening_sessions;

create policy "ls_select_own" on public.listening_sessions
  for select using (auth.uid() = user_id);

create policy "ls_insert_own" on public.listening_sessions
  for insert with check (auth.uid() = user_id);

create policy "ls_update_own" on public.listening_sessions
  for update using (auth.uid() = user_id);

-- 재생수 증가용 RPC (있으면 교체)
create or replace function public.inc_listening_plays(_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.listening_sessions
  set plays = coalesce(plays, 0) + 1
  where id = _id
    and user_id = auth.uid();
$$;

grant execute on function public.inc_listening_plays(uuid) to authenticated;
