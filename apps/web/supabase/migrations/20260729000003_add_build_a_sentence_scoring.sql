-- Add Build a Sentence (Choose Response) scoring columns to writing_2026_sessions

alter table if exists public.writing_2026_sessions
  add column if not exists ai_build_a_sentence_score int;

alter table if exists public.writing_2026_sessions
  add column if not exists final_build_a_sentence_score int;

-- Also add to writing_2026_answers
alter table if exists public.writing_2026_answers
  add column if not exists ai_build_a_sentence_score int;

alter table if exists public.writing_2026_answers
  add column if not exists final_build_a_sentence_score int;
