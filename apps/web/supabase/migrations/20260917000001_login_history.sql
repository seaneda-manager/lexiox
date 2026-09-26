-- 회원 로그인 기록: 로그인 성공 시각/IP/기기 정보를 적재해 관리자가 조회할 수 있게 함.

create table if not exists public.login_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  email text,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_login_history_user_created on public.login_history(user_id, created_at desc);
create index if not exists idx_login_history_created on public.login_history(created_at desc);

alter table public.login_history enable row level security;

drop policy if exists "login_history_insert_own" on public.login_history;
create policy "login_history_insert_own"
  on public.login_history for insert
  with check (auth.uid() = user_id);

drop policy if exists "login_history_admin_select" on public.login_history;
create policy "login_history_admin_select"
  on public.login_history for select
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));
