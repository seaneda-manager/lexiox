-- 단어 드릴 문항별 결과 기록
-- 목적: 유형별/단어별 정답률 → 강약점 분석·복습 큐·선생님 리포트
-- 지금까지 드릴은 결과를 전혀 저장하지 않아 분석에 0으로 잡혔다.

create table if not exists public.vocab_drill_results (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null,                 -- auth.users.id
  set_id       uuid,
  word_id      uuid not null,
  drill_type   text not null,
  is_correct   boolean not null,
  answered_at  timestamptz not null default now(),
  meta         jsonb
);

create index if not exists vocab_drill_results_student_idx
  on public.vocab_drill_results (student_id, answered_at desc);

create index if not exists vocab_drill_results_word_idx
  on public.vocab_drill_results (student_id, word_id);

create index if not exists vocab_drill_results_type_idx
  on public.vocab_drill_results (student_id, drill_type);

alter table public.vocab_drill_results enable row level security;

-- 학생은 본인 기록만 남기고 본인 것만 조회
drop policy if exists vocab_drill_results_insert_own on public.vocab_drill_results;
create policy vocab_drill_results_insert_own
  on public.vocab_drill_results for insert
  to authenticated
  with check (student_id = auth.uid());

drop policy if exists vocab_drill_results_select_own on public.vocab_drill_results;
create policy vocab_drill_results_select_own
  on public.vocab_drill_results for select
  to authenticated
  using (student_id = auth.uid());
