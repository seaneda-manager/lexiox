-- 학생이 Day 학습 중간에 멈췄을 때(브라우저 종료, 캐시 삭제, 기기 변경) 서버에서
-- 어느 Stage까지 했는지 이어할 수 있도록 저장하는 컬럼.
-- 지금까지는 localStorage(vocab_progress_${setId})에만 저장되어 있어서
-- 캐시를 지우거나 다른 기기로 바꾸면 진행 상황이 사라졌음.
alter table public.student_vocab_assignments
  add column if not exists session_state jsonb;

comment on column public.student_vocab_assignments.session_state is
  '학생이 이 Day를 진행하다 멈췄을 때의 stage(PRESCREEN/SPELLING/SUMMARY 등)와 결과. 서버 저장으로 기기 변경/캐시 삭제에도 유지됨.';
