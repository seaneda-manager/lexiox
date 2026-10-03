-- 학생별 내신 시험 일정
create table if not exists naesin_exam_schedule (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references profiles(id) on delete cascade,
  exam_name   text not null default '내신 시험',
  exam_date   date not null,
  school      text,
  note        text,
  created_by  uuid references profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_naesin_exam_schedule_student
  on naesin_exam_schedule(student_id, exam_date);

alter table naesin_exam_schedule enable row level security;

-- 학생: 자신 것 읽기
drop policy if exists "student_read_own_exam_schedule" on naesin_exam_schedule;
create policy "student_read_own_exam_schedule"
  on naesin_exam_schedule for select
  using (student_id = auth.uid());

-- 선생님/어드민: 전부
drop policy if exists "teacher_admin_all_exam_schedule" on naesin_exam_schedule;
create policy "teacher_admin_all_exam_schedule"
  on naesin_exam_schedule for all
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.role in ('teacher', 'admin')
    )
  );
