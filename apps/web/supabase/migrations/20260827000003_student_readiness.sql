-- 내신 시험대비 시스템 Phase 2 (중학 골격): 유닛 안 각 sub요소별 "수행→check→test" 추적.
-- "readiness"는 별도 4번째 단계가 아니라 test_status='done'일 때의 파생 상태로 다룬다
-- (행을 stage별로 나누면 readiness 리스트 화면에서 sub요소당 3번 join해야 해서 비효율적).
--
-- unit은 기존 middle_naesin_units를 그대로 재사용 — 새 유닛 개념을 또 안 만든다.
-- student_id는 middle_naesin_assignments와 동일하게 auth.users를 직접 참조
-- (academy_students.id가 아님 — 이 영역 기존 컨벤션을 따름, student_vocab_plans 등
-- 다른 영역은 academy_students.id를 쓰는 것과 다르니 헷갈리지 말 것).

create table if not exists student_readiness (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  unit_id uuid not null references middle_naesin_units(id) on delete cascade,
  element text not null check (element in ('vocab', 'dialogue', 'grammar', 'passage', 'formative', 'oral', 'mock_exam')),
  sub_element text not null, -- 예: '영한', '한영', '영영', '숙어', '상황별표현', ...
  perform_status text not null default 'not_started' check (perform_status in ('not_started', 'in_progress', 'done')),
  check_status text not null default 'not_started' check (check_status in ('not_started', 'in_progress', 'done')),
  test_status text not null default 'not_started' check (test_status in ('not_started', 'in_progress', 'done')),
  test_score numeric,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (student_id, unit_id, element, sub_element)
);

create index if not exists idx_student_readiness_student_unit on student_readiness(student_id, unit_id);

alter table student_readiness enable row level security;

drop policy if exists "student_readiness_own" on student_readiness;
create policy "student_readiness_own"
  on student_readiness
  for all
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

drop policy if exists "student_readiness_staff_all" on student_readiness;
create policy "student_readiness_staff_all"
  on student_readiness
  for all
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'teacher')))
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'teacher')));
