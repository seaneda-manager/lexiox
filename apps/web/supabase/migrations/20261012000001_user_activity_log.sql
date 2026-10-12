-- 전체 사용자 활동 로그: 로그인/페이지 이동 등 모든 활동을 적재해 관리자가 조회할 수 있게 함.

create table if not exists public.user_activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,            -- 'login' | 'page_view' | ...
  path text,                       -- 이동/발생 경로
  metadata jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_activity_user_created on public.user_activity_log(user_id, created_at desc);
create index if not exists idx_user_activity_created on public.user_activity_log(created_at desc);
create index if not exists idx_user_activity_action_created on public.user_activity_log(action, created_at desc);

alter table public.user_activity_log enable row level security;

drop policy if exists "user_activity_insert_own" on public.user_activity_log;
create policy "user_activity_insert_own"
  on public.user_activity_log for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_activity_admin_select" on public.user_activity_log;
create policy "user_activity_admin_select"
  on public.user_activity_log for select
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));
