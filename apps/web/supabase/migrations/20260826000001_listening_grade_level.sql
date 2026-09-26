-- 중학 Listening 레벨 세트(중1~중3 × low/mid/high) 지원
--
-- listening_tests_2026은 지금까지 TOEFL 전용이었다(program 구분 없음).
-- 여기에 program/grade/level을 추가해서 같은 테이블·같은 응시 파이프라인
-- (test_assignments → ListeningSessionContainer → listening_results_2026 → 리뷰)을
-- 중학 레벨 세트에도 그대로 재사용한다.

alter table public.listening_tests_2026
  add column if not exists program text not null default 'toefl',
  add column if not exists grade   text check (grade in ('ms1', 'ms2', 'ms3')),
  add column if not exists level   text check (level in ('low', 'mid', 'high'));

create index if not exists listening_tests_2026_program_idx
  on public.listening_tests_2026 (program);
