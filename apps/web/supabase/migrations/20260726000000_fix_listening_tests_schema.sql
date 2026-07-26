-- listening_tests 테이블이 두 개의 서로 다른 마이그레이션(20260706000000, 20260725000001)에서
-- CREATE TABLE IF NOT EXISTS로 정의되어 있었고, 먼저 적용된 20260706000000 버전이 실제 테이블을
-- 만들어서 content/exam_era/status 컬럼이 실제 DB에는 존재하지 않았다.
-- ALTER TABLE ADD COLUMN IF NOT EXISTS로 누락된 컬럼을 보강한다.

alter table if exists public.listening_tests
  add column if not exists exam_era text default 'ibt_2026';

alter table if exists public.listening_tests
  add column if not exists content jsonb;

alter table if exists public.listening_tests
  add column if not exists status text default 'active';

do $$
begin
  if not exists (
    select 1 from information_schema.constraint_column_usage
    where table_name = 'listening_tests' and column_name = 'status'
  ) then
    alter table public.listening_tests
      add constraint listening_tests_status_check
      check (status in ('active', 'locked', 'archived'));
  end if;
exception when duplicate_object then
  null;
end $$;
