-- test_assignments에 결과 저장용 컬럼 추가
-- 누락 시 start 페이지의 select가 에러를 내며 404로 보인다.
alter table public.test_assignments
add column if not exists results_payload jsonb,
add column if not exists score numeric,
add column if not exists submitted_at timestamptz;
