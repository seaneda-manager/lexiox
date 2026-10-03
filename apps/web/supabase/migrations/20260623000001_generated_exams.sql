create table if not exists generated_exams (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  created_by  uuid not null references auth.users(id) on delete cascade,
  school      text not null,
  grade       text not null,
  exam_year   int  not null,
  exam_month  int  not null,
  questions   jsonb not null default '[]'
);

alter table generated_exams enable row level security;

-- Teachers can only see/manage their own exams
create policy "teacher own exams select" on generated_exams
  for select using (auth.uid() = created_by);

create policy "teacher own exams insert" on generated_exams
  for insert with check (auth.uid() = created_by);

create policy "teacher own exams delete" on generated_exams
  for delete using (auth.uid() = created_by);

create index generated_exams_created_by_idx on generated_exams(created_by, created_at desc);
