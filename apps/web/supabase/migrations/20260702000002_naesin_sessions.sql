-- supabase/migrations/20260702000002_naesin_sessions.sql
-- Naesin 학생 드릴 세션 (Stage1~5 진행 상황 autosave)
-- naesin_assignments는 target_type/target_id/scope_id 기반의 별도 배정 체계라
-- 이번 세션 테이블에서는 연동하지 않고 passage_id를 직접 참조한다 (배정 연동은 후속 과제).

create table if not exists public.naesin_sessions (
  id                     uuid primary key default gen_random_uuid(),
  student_id             uuid not null references auth.users(id) on delete cascade,
  passage_id             uuid not null references public.naesin_passages(id) on delete cascade,
  assignment_id          uuid, -- 향후 배정 체계 연동용, 지금은 FK 없이 nullable

  status                 text not null default 'started' check (status in ('started', 'submitted')),
  logs                   jsonb not null default '{}'::jsonb, -- structureLogs/translationLogs/compositionLogs/sentenceFunctionLogs

  started_at             timestamptz not null default now(),
  submitted_at           timestamptz,
  updated_at             timestamptz not null default now()
);

create index if not exists idx_naesin_sessions_student on public.naesin_sessions (student_id);
create index if not exists idx_naesin_sessions_passage  on public.naesin_sessions (passage_id);
create index if not exists idx_naesin_sessions_status   on public.naesin_sessions (status);

alter table public.naesin_sessions enable row level security;

drop policy if exists "naesin_sessions_own_select" on public.naesin_sessions;
create policy "naesin_sessions_own_select" on public.naesin_sessions
  for select to authenticated using (auth.uid() = student_id);

drop policy if exists "naesin_sessions_own_insert" on public.naesin_sessions;
create policy "naesin_sessions_own_insert" on public.naesin_sessions
  for insert to authenticated with check (auth.uid() = student_id);

drop policy if exists "naesin_sessions_own_update" on public.naesin_sessions;
create policy "naesin_sessions_own_update" on public.naesin_sessions
  for update to authenticated using (auth.uid() = student_id) with check (auth.uid() = student_id);

drop policy if exists "naesin_sessions_admin_select" on public.naesin_sessions;
create policy "naesin_sessions_admin_select" on public.naesin_sessions
  for select to authenticated using (public.is_admin_or_producer(auth.uid()));

drop trigger if exists trg_naesin_sessions_updated_at on public.naesin_sessions;
create trigger trg_naesin_sessions_updated_at
  before update on public.naesin_sessions
  for each row execute function public.tg_set_updated_at();
