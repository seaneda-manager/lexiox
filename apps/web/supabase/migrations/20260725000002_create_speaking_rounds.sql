-- Create speaking rounds table to group tests by round
create table if not exists public.speaking_rounds (
  id uuid primary key default gen_random_uuid(),
  round_number integer not null,
  speaking_test_id uuid not null references speaking_tests(id) on delete cascade,
  is_active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(round_number)
);

-- Update test_assignments to use speaking_round_id
alter table if exists public.test_assignments
add column if not exists speaking_round_id uuid references speaking_rounds(id) on delete restrict;

-- Create indexes for performance
create index if not exists test_assignments_speaking_round_id_idx on test_assignments(speaking_round_id);
create index if not exists speaking_rounds_test_id_idx on speaking_rounds(speaking_test_id);
create index if not exists speaking_rounds_active_idx on speaking_rounds(is_active);
