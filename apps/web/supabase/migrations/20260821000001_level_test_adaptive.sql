-- 레벨 테스트를 실시간 적응형(2-stage)으로 확장.
-- TOEFL 트랙만 4단계(초급/중급/고급/최고급)로 세분화, Jr./중등/고등은 기존 3단계(하/중/상) 유지.
--
-- 이 DB에는 20260811000004_level_test_ai_generation.sql이 적용된 적이 없어
-- level_test_questions에 track/sub_level/generated_by_ai 컬럼이 없는 상태였다.
-- 그래서 이 마이그레이션에 그 내용을 그대로 포함해 한 번에 최신 상태로 맞춘다 (전부 idempotent).

-- ── 20260811000004 내용 (누락되어 있었던 것) ──
alter table level_test_questions drop constraint if exists level_test_questions_section_check;
alter table level_test_questions
  add constraint level_test_questions_section_check
  check (section in ('grammar', 'vocab', 'listening', 'reading', 'speaking', 'writing'));

alter table level_test_questions
  add column if not exists track text,
  add column if not exists sub_level text,
  add column if not exists generated_by_ai boolean not null default false;

alter table level_test_responses
  add column if not exists response_text text;

-- ── 여기부터 오늘 작업: 적응형 확장 ──

alter table level_test_questions drop constraint if exists level_test_questions_track_check;
alter table level_test_questions
  add constraint level_test_questions_track_check
  check (track is null or track in ('jr', 'middle', 'high', 'toefl'));

alter table level_test_questions drop constraint if exists level_test_questions_sub_level_check;
alter table level_test_questions
  add constraint level_test_questions_sub_level_check
  check (sub_level is null or sub_level in ('low', 'mid', 'high', 'highest'));

-- 'highest'는 toefl 트랙에서만 허용 (jr/middle/high는 3단계 그대로)
alter table level_test_questions drop constraint if exists level_test_questions_highest_toefl_only;
alter table level_test_questions
  add constraint level_test_questions_highest_toefl_only
  check (sub_level <> 'highest' or track = 'toefl');

alter table level_test_sessions
  add column if not exists track text,
  add column if not exists stage int not null default 1,
  add column if not exists branch text,
  add column if not exists recommended_sub_level text;

alter table level_test_sessions drop constraint if exists level_test_sessions_track_check;
alter table level_test_sessions
  add constraint level_test_sessions_track_check
  check (track is null or track in ('jr', 'middle', 'high', 'toefl'));

alter table level_test_sessions drop constraint if exists level_test_sessions_branch_check;
alter table level_test_sessions
  add constraint level_test_sessions_branch_check
  check (branch is null or branch in ('HARD', 'EASY'));

alter table level_test_sessions drop constraint if exists level_test_sessions_recommended_sub_level_check;
alter table level_test_sessions
  add constraint level_test_sessions_recommended_sub_level_check
  check (recommended_sub_level is null or recommended_sub_level in ('low', 'mid', 'high', 'highest'));
