-- Vocab learning attempts tracking
create table if not exists public.vocab_learning_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null,
  set_id uuid not null,
  wrong_word_ids text[] not null default '{}',
  stage text not null check (stage in ('know', 'spelling', 'speed')),
  accuracy numeric,
  passed boolean,
  attempted_at timestamp with time zone not null,
  created_at timestamp with time zone not null default now()
);

create index if not exists idx_vocab_learning_attempts_student_id on public.vocab_learning_attempts(student_id);
create index if not exists idx_vocab_learning_attempts_set_id on public.vocab_learning_attempts(set_id);
create index if not exists idx_vocab_learning_attempts_attempted_at on public.vocab_learning_attempts(attempted_at);

grant select, insert on public.vocab_learning_attempts to authenticated;
grant select, insert, update, delete on public.vocab_learning_attempts to service_role;
