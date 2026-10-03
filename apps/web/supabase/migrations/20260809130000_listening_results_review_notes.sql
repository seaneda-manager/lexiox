-- Listening 리뷰 화면의 "노트" 탭 저장용. questionId -> 노트 텍스트로 저장한다.
alter table public.listening_results_2026
  add column if not exists review_notes jsonb not null default '{}'::jsonb;
