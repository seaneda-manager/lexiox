-- 학생 유닛 완료 기록
create table if not exists grammar_2026_unit_completions (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references auth.users(id) on delete cascade,
  unit_id     text not null references grammar_2026_units(id) on delete cascade,
  completed_at timestamptz default now(),
  unique (student_id, unit_id)
);

create index if not exists idx_grammar_2026_completions_student on grammar_2026_unit_completions(student_id);

alter table grammar_2026_unit_completions enable row level security;
drop policy if exists "students read own completions" on grammar_2026_unit_completions;
create policy "students read own completions" on grammar_2026_unit_completions for select to authenticated using (auth.uid() = student_id);
drop policy if exists "students insert own completions" on grammar_2026_unit_completions;
create policy "students insert own completions" on grammar_2026_unit_completions for insert to authenticated with check (auth.uid() = student_id);
