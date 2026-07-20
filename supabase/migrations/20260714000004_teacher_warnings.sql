-- Teacher warnings (Yellow Card) system
create table if not exists public.teacher_warnings (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null,
  teacher_id uuid not null,
  reason text not null,
  severity text check (severity in ('yellow', 'red')),
  status text check (status in ('active', 'resolved', 'dismissed')),
  issued_at timestamp with time zone not null default now(),
  resolved_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone not null default now()
);

create index if not exists idx_teacher_warnings_student_id on public.teacher_warnings(student_id);
create index if not exists idx_teacher_warnings_teacher_id on public.teacher_warnings(teacher_id);
create index if not exists idx_teacher_warnings_status on public.teacher_warnings(status);

grant select, insert, update on public.teacher_warnings to authenticated;
grant select, insert, update, delete on public.teacher_warnings to service_role;

alter table public.teacher_warnings enable row level security;

create policy "Teachers can view warnings for their students"
  on public.teacher_warnings for select
  using (auth.uid() = teacher_id);

create policy "Teachers can insert warnings"
  on public.teacher_warnings for insert
  with check (auth.uid() = teacher_id);

create policy "Teachers can update their warnings"
  on public.teacher_warnings for update
  using (auth.uid() = teacher_id);
