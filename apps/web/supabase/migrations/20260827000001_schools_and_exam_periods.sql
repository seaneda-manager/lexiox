-- 내신 시험대비 시스템 Phase 0: 학교 정규화 + 학교별 시험기간.
-- academy_students.school은 지금까지 자유텍스트라 학교 단위로 시험기간을 정확히
-- 매칭할 수 없었음. schools 테이블로 정규화하고, academy_students.school_id(FK)를
-- 새로 추가한다 — 기존 school 텍스트 컬럼은 그대로 두고 계속 표시용으로 병행 사용
-- (기존 화면들이 다 그 컬럼을 읽고 있어서 건드릴 필요 없음, 저장 시 이름을 그대로 미러링).
--
-- school_exam_periods: 학교마다 중간/기말 시험 날짜·기간이 다 다르고 학기마다 학교
-- 공지가 나와야 알 수 있어서 자동생성 불가 — 관리자가 학기마다 수동 입력.

create table if not exists schools (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table academy_students
  add column if not exists school_id uuid references schools(id);

create index if not exists idx_academy_students_school_id on academy_students(school_id);

create table if not exists school_exam_periods (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  year int not null,
  semester int not null check (semester in (1, 2)),
  exam_type text not null check (exam_type in ('midterm', 'final')),
  start_date date not null,
  end_date date not null,
  prep_start_date date not null, -- 시험 준비기간 시작일 (보통 start_date - 1개월, 수동 조정 가능)
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date),
  check (start_date >= prep_start_date)
);

create index if not exists idx_school_exam_periods_school on school_exam_periods(school_id, start_date);

alter table schools enable row level security;
alter table school_exam_periods enable row level security;

drop policy if exists "schools_admin_all" on schools;
create policy "schools_admin_all"
  on schools
  for all
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'teacher')))
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'teacher')));

drop policy if exists "schools_select_all" on schools;
create policy "schools_select_all"
  on schools
  for select
  using (true);

drop policy if exists "school_exam_periods_admin_all" on school_exam_periods;
create policy "school_exam_periods_admin_all"
  on school_exam_periods
  for all
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'teacher')))
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'teacher')));

drop policy if exists "school_exam_periods_select_own" on school_exam_periods;
create policy "school_exam_periods_select_own"
  on school_exam_periods
  for select
  using (
    exists (
      select 1 from academy_students
      where academy_students.school_id = school_exam_periods.school_id
        and academy_students.auth_user_id = auth.uid()
    )
  );
