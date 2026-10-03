-- test_assignments: 선생님이 학생에게 시험을 assign하는 테이블
-- 이미 존재할 경우 컬럼 추가 방식으로 확장

create table if not exists test_assignments (
  id               uuid primary key default gen_random_uuid(),
  student_id       uuid not null references profiles(id) on delete cascade,
  assigned_at      timestamptz not null default now(),
  due_date         date,
  sections         text[] not null default '{}',
  speaking_test_id uuid references speaking_tests(id) on delete set null,
  status           text not null default 'pending'
                     check (status in ('pending', 'in_progress', 'completed')),
  started_at       timestamptz,
  completed_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- assigned_by 컬럼이 없으면 추가
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'test_assignments' and column_name = 'assigned_by'
  ) then
    alter table test_assignments add column assigned_by uuid references profiles(id) on delete set null;
  end if;
end $$;

-- 인덱스 (이미 있으면 skip)
create index if not exists test_assignments_student_id_idx on test_assignments (student_id);
create index if not exists test_assignments_assigned_by_idx on test_assignments (assigned_by);
create index if not exists test_assignments_status_idx on test_assignments (status);

alter table test_assignments enable row level security;

-- 정책 (drop & recreate)
drop policy if exists "teacher_admin_all_assignments" on test_assignments;
create policy "teacher_admin_all_assignments"
  on test_assignments for all
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.role in ('teacher', 'admin')
    )
  );

drop policy if exists "student_own_assignments" on test_assignments;
create policy "student_own_assignments"
  on test_assignments for select
  using (student_id = auth.uid());

drop policy if exists "student_update_own_assignment" on test_assignments;
create policy "student_update_own_assignment"
  on test_assignments for update
  using (student_id = auth.uid());
