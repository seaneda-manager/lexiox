create table if not exists public.speaking_voca_drill_results (
  id uuid primary key default gen_random_uuid(),

  user_id uuid references auth.users(id) on delete set null,
  mode text default 'task1',
  prompt text not null,
  script text not null,
  must_use_words text[] not null,
  approx_sentences integer not null default 0,

  meta jsonb,
  created_at timestamptz not null default now()
);

alter table public.speaking_voca_drill_results enable row level security;
