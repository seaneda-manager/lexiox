-- DRAFT (미적용): Study 모드 진행 저장 — 기기가 바뀌어도 이어 풀기
-- 적용 전 검토 필요. supabase/migrations 에 넣지 않았다(자동 적용 방지).
-- 현재는 브라우저 localStorage(키: reading2026_study__<testId>)로 동작하며,
-- 이 테이블이 적용되면 loadStudyProgress/저장 effect 뒤에 서버 동기화를 붙인다.

create table if not exists public.study_progress (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  section     text not null check (section in ('reading','listening','speaking','writing')),
  test_id     uuid not null,
  state       jsonb not null,            -- StudyProgress(phase, currentIdx, answers, flagged, checked ...)
  updated_at  timestamptz not null default now(),
  unique (user_id, section, test_id)
);

alter table public.study_progress enable row level security;

create policy "own study progress - select" on public.study_progress
  for select using (auth.uid() = user_id);
create policy "own study progress - upsert" on public.study_progress
  for insert with check (auth.uid() = user_id);
create policy "own study progress - update" on public.study_progress
  for update using (auth.uid() = user_id);
create policy "own study progress - delete" on public.study_progress
  for delete using (auth.uid() = user_id);
