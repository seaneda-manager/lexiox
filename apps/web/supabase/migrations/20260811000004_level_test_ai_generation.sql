-- 레벨 테스트 AI 생성 지원: writing 섹션 추가 + 12단계(4트랙×상중하) 태깅.
-- 기존 check 제약을 지우고 writing을 포함해 다시 건다.
alter table level_test_questions drop constraint if exists level_test_questions_section_check;
alter table level_test_questions
  add constraint level_test_questions_section_check
  check (section in ('grammar', 'vocab', 'listening', 'reading', 'speaking', 'writing'));

alter table level_test_questions
  add column if not exists track text check (track in ('jr', 'middle', 'high', 'toefl')),
  add column if not exists sub_level text check (sub_level in ('low', 'mid', 'high')),
  add column if not exists generated_by_ai boolean not null default false;

-- writing은 서술형 응답이라 speaking(녹음)처럼 자동채점 대상이 아니다 — 선생님이 읽고 검토한다.
alter table level_test_responses
  add column if not exists response_text text;
