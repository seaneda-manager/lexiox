create table if not exists public.teacher_tasks (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null references auth.users(id) on delete cascade,
  label       text not null,
  status      text not null default 'pending' check (status in ('pending', 'done', 'overdue')),
  category    text not null default '기타' check (category in ('상담', '채점', '과제', '관리', '기타')),
  student_name text,
  due_at      timestamptz,
  due_display text,
  created_at  timestamptz not null default now()
);

alter table public.teacher_tasks enable row level security;

create policy "teacher_tasks_select_own"  on public.teacher_tasks for select  using (auth.uid() = teacher_id);
create policy "teacher_tasks_insert_own"  on public.teacher_tasks for insert  with check (auth.uid() = teacher_id);
create policy "teacher_tasks_update_own"  on public.teacher_tasks for update  using (auth.uid() = teacher_id) with check (auth.uid() = teacher_id);
create policy "teacher_tasks_delete_own"  on public.teacher_tasks for delete  using (auth.uid() = teacher_id);
