-- 중학 Listening 부가 학습(딕테이션 / 노트테이킹 / 즉시회상 리텐션) 결과 저장
--
-- 기존 dictations 테이블은 test_id/track_id 그룹핑이 없고 코드베이스 어디서도
-- 참조되지 않는 고아 테이블이라 재사용하지 않는다. 3개 신규 기능을 kind로
-- 구분해 하나의 테이블에 통합 저장한다(listening_results_2026과 같은 RLS 패턴).

create table if not exists public.listening_practice_results_2026 (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete set null,
  test_id       uuid not null references public.listening_tests_2026(id) on delete cascade,
  result_id     uuid references public.listening_results_2026(id) on delete set null,
  track_id      text not null,
  kind          text not null check (kind in ('dictation', 'notetaking', 'retention')),
  payload       jsonb not null default '{}',
  correct_count integer,
  total_count   integer,
  wer           numeric,
  created_at    timestamptz not null default now()
);

create index if not exists listening_practice_results_2026_user_idx
  on public.listening_practice_results_2026 (user_id, created_at desc);
create index if not exists listening_practice_results_2026_test_idx
  on public.listening_practice_results_2026 (test_id, kind);

alter table public.listening_practice_results_2026 enable row level security;

drop policy if exists "listening_practice_results_2026_own_read" on public.listening_practice_results_2026;
create policy "listening_practice_results_2026_own_read"
  on public.listening_practice_results_2026 for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "listening_practice_results_2026_service_all" on public.listening_practice_results_2026;
create policy "listening_practice_results_2026_service_all"
  on public.listening_practice_results_2026 for all
  to service_role
  using (true) with check (true);
