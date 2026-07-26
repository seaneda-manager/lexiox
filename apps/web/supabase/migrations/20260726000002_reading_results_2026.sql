-- reading_tests (test_assignments.reading_test_id의 FK 대상)는 20260706000000에서
-- id/label/description/is_locked만 있는 스텁으로 생성되었음. listening_tests/speaking_tests/
-- writing_tests와 동일한 문제 — payload/exam_era 컬럼이 없어 실제 시험 데이터를 미러링할 수 없었다.
alter table if exists public.reading_tests
  add column if not exists exam_era text default 'ibt_2026';

alter table if exists public.reading_tests
  add column if not exists payload jsonb;

alter table if exists public.reading_tests
  add column if not exists status text default 'active';

-- reading_results_2026: 학생별 Reading 2026 시험 결과 저장
-- 이 테이블은 supabase/migrations(repo root)에만 존재했고 apps/web 쪽엔 없었음.
-- 이 환경이 apps/web 마이그레이션만 적용한다면 프로덕션에 테이블 자체가 없을 수 있어 여기에도 동일하게 추가.

create table if not exists public.reading_results_2026 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  test_id uuid,
  assignment_id uuid references public.test_assignments (id) on delete set null,
  label text,
  total_questions integer not null default 0,
  is_adaptive boolean default false,
  stage2_difficulty text,
  finished_at timestamptz default now(),
  raw_result jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.reading_results_2026 add column if not exists assignment_id uuid references public.test_assignments (id) on delete set null;
alter table public.reading_results_2026 add column if not exists is_adaptive boolean default false;
alter table public.reading_results_2026 add column if not exists stage2_difficulty text;

create index if not exists idx_reading_results_2026_user on public.reading_results_2026 (user_id);
create index if not exists idx_reading_results_2026_test on public.reading_results_2026 (test_id);
create index if not exists idx_reading_results_2026_assignment on public.reading_results_2026 (assignment_id);

alter table public.reading_results_2026 enable row level security;

drop policy if exists "reading_results_2026 own read" on public.reading_results_2026;
create policy "reading_results_2026 own read" on public.reading_results_2026
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "reading_results_2026 own insert" on public.reading_results_2026;
create policy "reading_results_2026 own insert" on public.reading_results_2026
  for insert to authenticated with check (user_id = auth.uid());
