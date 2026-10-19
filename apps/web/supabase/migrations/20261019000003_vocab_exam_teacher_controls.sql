-- 학원용 단어 숙달 사이클 (3/3): 선생님 재응시 허용(무효 처리) + 수업일 제한 옵션
-- 운영 DB에는 SQL Editor에서 적용한다. 재실행해도 안전하도록 if not exists 를 사용한다.

alter table public.vocab_test_sessions
  add column if not exists voided_at  timestamptz,
  add column if not exists voided_by  uuid,
  add column if not exists void_reason text;

create index if not exists idx_vts_voided on public.vocab_test_sessions (voided_at) where voided_at is not null;

-- true 면 수업일(academy_students.class_days)에만 시험/복습시험 시작 가능 (기본 꺼짐)
alter table public.vocab_test_configs
  add column if not exists require_class_day boolean not null default false;
