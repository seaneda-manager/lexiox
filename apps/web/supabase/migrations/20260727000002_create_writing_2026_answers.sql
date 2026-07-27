-- Create writing_2026_answers table to store per-item responses
-- Referenced by /api/writing-2026/submit

create table if not exists public.writing_2026_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.writing_2026_sessions (id) on delete cascade,
  item_key text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_writing_2026_answers_session
  on public.writing_2026_answers (session_id);

create index if not exists idx_writing_2026_answers_item_key
  on public.writing_2026_answers (item_key);
