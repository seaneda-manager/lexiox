-- Vocabulary student goals tracking
create table if not exists public.vocab_student_goals (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null,
  course_id uuid not null,
  target_day integer not null,
  deadline date not null,
  status text check (status in ('active', 'completed', 'abandoned')),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists idx_vocab_student_goals_student_id on public.vocab_student_goals(student_id);
create index if not exists idx_vocab_student_goals_course_id on public.vocab_student_goals(course_id);

grant select, insert, update on public.vocab_student_goals to authenticated;
grant select, insert, update, delete on public.vocab_student_goals to service_role;

-- RLS 정책
alter table public.vocab_student_goals enable row level security;

create policy "Students can view their own goals"
  on public.vocab_student_goals for select
  using (auth.uid() = (select user_id from academy_students where id = student_id));

create policy "Students can insert their own goals"
  on public.vocab_student_goals for insert
  with check (auth.uid() = (select user_id from academy_students where id = student_id));

create policy "Students can update their own goals"
  on public.vocab_student_goals for update
  using (auth.uid() = (select user_id from academy_students where id = student_id));
