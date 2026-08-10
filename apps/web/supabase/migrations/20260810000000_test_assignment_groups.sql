-- Full Test / Half Test: Reading/Listening/Speaking/Writing를 실제 TOEFL 순서로
-- 묶어서 배정하기 위한 상위 그룹 테이블. 기존 test_assignments(영역별 단일 row)는
-- 그대로 두고, group_id/group_sequence로만 소속을 표시한다.
create table if not exists public.test_assignment_groups (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null,
  assigned_by uuid,
  kind text not null check (kind in ('full', 'half')),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  due_date timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.test_assignments
  add column if not exists group_id uuid references public.test_assignment_groups(id) on delete cascade;

alter table public.test_assignments
  add column if not exists group_sequence smallint;

create index if not exists test_assignment_groups_student_id_idx on test_assignment_groups(student_id);
create index if not exists test_assignments_group_id_idx on test_assignments(group_id);
