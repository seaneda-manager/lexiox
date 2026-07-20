alter table public.reading_tests_2026
  add column if not exists is_locked boolean not null default false;
