-- 2026 Listening 결과 저장 테이블
--
-- 기존 listening_sessions / listening_answers / listening_results 는 옛 트랙 기반
-- 설계(track_id, mode, plays, band_score)라 모듈 기반 2026 러너와 맞지 않았다.
-- 저장 라우트가 존재하지 않는 컬럼(test_id, module, difficulty, status)에 쓰고 있어
-- 제출이 매번 실패했고, listening_answers/listening_results 는 0행이었다.
--
-- reading_results_2026 과 같은 형태로 맞춘다.

create table if not exists public.listening_results_2026 (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete set null,
  test_id         uuid not null,
  assignment_id   uuid,
  module          smallint not null check (module in (1, 2)),
  difficulty      text check (difficulty in ('hard', 'easy')),
  correct_count   integer not null default 0,
  total_questions integer not null default 0,
  -- [{ questionId, choiceIndex, isCorrect }]
  answers         jsonb not null default '[]',
  finished_at     timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

create index if not exists listening_results_2026_user_idx
  on public.listening_results_2026 (user_id, created_at desc);
create index if not exists listening_results_2026_test_idx
  on public.listening_results_2026 (test_id);
create index if not exists listening_results_2026_assignment_idx
  on public.listening_results_2026 (assignment_id);

alter table public.listening_results_2026 enable row level security;

-- 학생은 자기 결과만 읽는다
drop policy if exists "listening_results_2026_own_read" on public.listening_results_2026;
create policy "listening_results_2026_own_read"
  on public.listening_results_2026 for select
  to authenticated
  using (user_id = auth.uid());

-- 쓰기는 서버(service_role)에서만 한다
drop policy if exists "listening_results_2026_service_all" on public.listening_results_2026;
create policy "listening_results_2026_service_all"
  on public.listening_results_2026 for all
  to service_role
  using (true) with check (true);
