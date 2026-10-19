-- 학원용 단어 숙달 사이클 (2/2): 시험 테이블 보안 정리
-- 학생이 시험 결과·문제를 직접 쓰거나(점수 조작), 정답을 직접 읽는 길을 닫는다.
-- 시험 API(start/answer/hint/submit)는 모두 service role 로만 읽고 쓰므로 앱 동작에는 영향이 없다.
-- 운영 DB에는 SQL Editor에서 이미 적용됨.

drop policy if exists auth_users_create_sessions        on public.vocab_test_sessions;
drop policy if exists students_can_insert_own_sessions  on public.vocab_test_sessions;
drop policy if exists students_can_update_own_sessions  on public.vocab_test_sessions;
drop policy if exists students_update_own_sessions      on public.vocab_test_sessions;
drop policy if exists admins_can_insert_sessions        on public.vocab_test_sessions;
drop policy if exists students_read_own_sessions        on public.vocab_test_sessions; -- 중복 (students_can_read_own_sessions 가 남음)

drop policy if exists auth_users_create_questions       on public.vocab_test_questions;
drop policy if exists students_update_own_questions     on public.vocab_test_questions;
drop policy if exists students_can_read_own_questions   on public.vocab_test_questions;
drop policy if exists students_read_own_questions       on public.vocab_test_questions;
