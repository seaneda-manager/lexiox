-- Adds a third content source ('completed') for typing_practice_attempts: passages
-- the student already finished via TOEFL reading/listening or Hi-내신 drills, pulled
-- live from reading_sessions/listening_sessions/hi_naesin_sessions rather than the
-- admin-curated typing_practice_content table. Manual apply required (Supabase console).

alter table public.typing_practice_attempts
  drop constraint if exists typing_practice_attempts_content_source_check;

alter table public.typing_practice_attempts
  add constraint typing_practice_attempts_content_source_check
  check (content_source in ('vocab', 'content', 'completed'));

-- Free-form provenance for 'completed' attempts (e.g. "reading:<passage_id>"), since
-- those don't reference a typing_practice_content row and content_id stays null there.
alter table public.typing_practice_attempts
  add column if not exists content_ref text null;
