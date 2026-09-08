-- 학생용 시험대비 스케줄러 Phase 2 — 학원 수업 스케줄 + 수업 후 로그
--
-- 학생 플래너의 "학원" 구역을 채운다. 선생님이 학원 수업 일정을 명시하고(plan_note),
-- 수업이 끝나면 같은 행에 로그(log_note = 배운 내용)와 숙제(homework_note)를 남긴다.
-- 학생 화면에는 읽기 전용으로 보인다.
--
-- 20260907000001_student_planner.sql 의 helper 함수(is_staff, is_own_academy_student)에
-- 의존한다 — 그 마이그레이션을 먼저 적용할 것.

create table if not exists student_lesson_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references academy_students(id) on delete cascade,
  lesson_date date not null,
  start_time time,
  end_time time,
  title text not null default '학원 수업',
  status text not null default 'scheduled' check (status in ('scheduled', 'done', 'canceled')),
  plan_note text,       -- 수업 전 계획
  log_note text,        -- 수업 후 로그 (배운 내용)
  homework_note text,   -- 이 수업에서 내준 숙제
  teacher_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_student_lesson_logs_student_date
  on student_lesson_logs(student_id, lesson_date);

alter table student_lesson_logs enable row level security;

drop policy if exists "student_lesson_logs_staff_all" on student_lesson_logs;
create policy "student_lesson_logs_staff_all" on student_lesson_logs
  for all using (public.is_staff()) with check (public.is_staff());

-- 학생: 본인 것 읽기 전용
drop policy if exists "student_lesson_logs_student_read" on student_lesson_logs;
create policy "student_lesson_logs_student_read" on student_lesson_logs
  for select using (public.is_own_academy_student(student_id));
