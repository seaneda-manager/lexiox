begin;

create or replace function public.is_current_user_student_key(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.academy_students s
    where s.id = p_student_id
       or s.auth_user_id = auth.uid()
          and s.id = p_student_id
       or s.user_id = auth.uid()
          and s.id = p_student_id
       or s.profile_id = auth.uid()
          and s.id = p_student_id
  )
  or p_student_id = auth.uid();
$$;

revoke all on function public.is_current_user_student_key(uuid) from public;
grant execute on function public.is_current_user_student_key(uuid) to authenticated;

-- student_tasks
drop policy if exists "student_tasks_select_own" on public.student_tasks;
create policy "student_tasks_select_own"
on public.student_tasks
for select
to authenticated
using (
  student_id is not null
  and public.is_current_user_student_key(student_id)
);

-- 필요하면 학생이 자기 task 상태를 바꿀 수 있게
drop policy if exists "student_tasks_update_own" on public.student_tasks;
create policy "student_tasks_update_own"
on public.student_tasks
for update
to authenticated
using (
  student_id is not null
  and public.is_current_user_student_key(student_id)
)
with check (
  student_id is not null
  and public.is_current_user_student_key(student_id)
);

-- student_vocab_plans
drop policy if exists "student_vocab_plans_select_own" on public.student_vocab_plans;
create policy "student_vocab_plans_select_own"
on public.student_vocab_plans
for select
to authenticated
using (
  public.is_current_user_student_key(student_id)
);

-- student_vocab_assignments
drop policy if exists "student_vocab_assignments_select_own" on public.student_vocab_assignments;
create policy "student_vocab_assignments_select_own"
on public.student_vocab_assignments
for select
to authenticated
using (
  public.is_current_user_student_key(student_id)
);

drop policy if exists "student_vocab_assignments_update_own" on public.student_vocab_assignments;
create policy "student_vocab_assignments_update_own"
on public.student_vocab_assignments
for update
to authenticated
using (
  public.is_current_user_student_key(student_id)
)
with check (
  public.is_current_user_student_key(student_id)
);

-- student_vocab_breaks
drop policy if exists "student_vocab_breaks_select_own" on public.student_vocab_breaks;
create policy "student_vocab_breaks_select_own"
on public.student_vocab_breaks
for select
to authenticated
using (
  public.is_current_user_student_key(student_id)
);

-- academy_students 본인 row도 읽게
drop policy if exists "academy_students_select_own" on public.academy_students;
create policy "academy_students_select_own"
on public.academy_students
for select
to authenticated
using (
  id = auth.uid()
  or auth_user_id = auth.uid()
  or user_id = auth.uid()
  or profile_id = auth.uid()
);

commit;
