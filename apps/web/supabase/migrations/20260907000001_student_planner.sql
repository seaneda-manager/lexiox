-- 학생용 시험대비 스케줄러 (Student Exam-Prep Planner) — Phase 1
--
-- 학생이 자기 시험공부 계획을 직접 짜는 도구. 하루를 3구역(학교/학원/집)으로 나눠
-- 시간 블록을 배치한다. 시험(과목 + 시작·끝 날짜)을 등록하면 프리셋으로 공부
-- 스케줄을 자동 생성한다.
--
--  - student_routine_slots : 요일 반복 템플릿 (학교 가용시간 조각 + 집 루틴)
--  - student_exams         : 학생이 대비 중인 시험 (수동 + 자동수입)
--  - student_day_blocks    : 특정 날짜의 실제 계획 블록
--
-- student_id는 전부 academy_students(id)를 참조한다 (calendar_events 선례와 동일한
-- ID 스킴). academy_students의 학생↔auth 매핑이 auth_user_id / user_id / profile_id
-- 세 컬럼에 흩어져 있어(레거시) RLS는 세 컬럼을 모두 확인한다.

-- ── helper: 이 학생 행이 현재 로그인 사용자 것인지 ────────────────────────────
create or replace function public.is_own_academy_student(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from academy_students s
    where s.id = p_student_id
      and auth.uid() in (s.auth_user_id, s.user_id, s.profile_id)
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'teacher')
  );
$$;

-- ── 1. student_routine_slots ───────────────────────────────────────────────
create table if not exists student_routine_slots (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references academy_students(id) on delete cascade,
  zone text not null check (zone in ('school', 'home')),
  weekday int not null check (weekday between 0 and 6), -- 0=일 .. 6=토
  start_time time not null,
  end_time time not null,
  kind text not null,          -- school: break|lunch|self_study  / home: study|homework|meal|rest
  label text,
  active_from date,
  active_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);

create index if not exists idx_student_routine_slots_student
  on student_routine_slots(student_id, weekday);

-- ── 2. student_exams ──────────────────────────────────────────────────────
create table if not exists student_exams (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references academy_students(id) on delete cascade,
  exam_type text not null
    check (exam_type in ('naesin_midterm', 'naesin_final', 'mock', 'toefl', 'other')),
  title text not null,
  subjects text[] not null default '{}',
  start_date date not null,
  end_date date not null,
  prep_start_date date not null,
  preset_key text,             -- 'standard' | 'intensive' | 'deep' (마지막 생성값)
  source text not null default 'student'
    check (source in ('student', 'school_period', 'assignment', 'naesin_schedule')),
  source_id uuid,              -- 자동수입 dedup 용
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date),
  check (start_date >= prep_start_date)
);

-- 자동수입 dedup: 같은 학생 + 같은 소스 + 같은 원본행은 1개만
create unique index if not exists uq_student_exams_source
  on student_exams(student_id, source, source_id)
  where source_id is not null;

create index if not exists idx_student_exams_student_date
  on student_exams(student_id, start_date);

-- ── 3. student_day_blocks ────────────────────────────────────────────────
create table if not exists student_day_blocks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references academy_students(id) on delete cascade,
  block_date date not null,
  zone text not null check (zone in ('school', 'academy', 'home')),
  start_time time,
  end_time time,
  kind text not null,          -- study|homework|review|test_prep|meal|rest|memo|class
  subject text,
  exam_id uuid references student_exams(id) on delete set null,
  title text not null,
  note text,
  source text not null default 'student'
    check (source in ('student', 'preset', 'teacher')),
  done boolean not null default false,
  done_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_student_day_blocks_student_date
  on student_day_blocks(student_id, block_date);

create index if not exists idx_student_day_blocks_exam
  on student_day_blocks(exam_id) where exam_id is not null;

-- ── RLS ──────────────────────────────────────────────────────────────────
alter table student_routine_slots enable row level security;
alter table student_exams enable row level security;
alter table student_day_blocks enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['student_routine_slots', 'student_exams', 'student_day_blocks']
  loop
    execute format('drop policy if exists "%s_staff_all" on %I', t, t);
    execute format(
      'create policy "%s_staff_all" on %I for all using (public.is_staff()) with check (public.is_staff())',
      t, t);

    execute format('drop policy if exists "%s_student_own" on %I', t, t);
    execute format(
      'create policy "%s_student_own" on %I for all using (public.is_own_academy_student(student_id)) with check (public.is_own_academy_student(student_id))',
      t, t);
  end loop;
end $$;
