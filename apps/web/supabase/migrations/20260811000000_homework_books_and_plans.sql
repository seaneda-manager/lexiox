-- 숙제 반복 배정 시스템: 교재(book) → 학생별 페이스(plan) → 자동 생성된 개별 숙제(photo_homework 재사용)
-- 교재 디지털화(OCR 자동 추출)는 나중 단계 — 지금은 관리자가 유닛별 정답을 직접 입력한다.

create table if not exists homework_books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subject text,
  total_units int,
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists homework_book_units (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references homework_books(id) on delete cascade,
  unit_index int not null,
  title text,
  answer_key_data jsonb not null default '{"items":[]}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (book_id, unit_index)
);

-- 학생별 진도 페이스. student_vocab_plans와 동일한 패턴(weekdays + cursor).
create table if not exists student_homework_plans (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id),
  book_id uuid not null references homework_books(id) on delete cascade,
  start_date date not null,
  weekdays int[] not null default '{1,3}',
  units_per_session int not null default 1,
  cursor_unit_index int not null default 1,
  is_enabled boolean not null default true,
  is_paused boolean not null default false,
  paused_reason text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, book_id)
);

-- 기존 photo_homework를 두 용도 모두에 쓴다:
--   student_id/book_id가 null  → 예전처럼 전체 공개 숙제 (그대로 동작)
--   student_id만 있음          → 특정 학생에게만 보이는 "특별 숙제"
--   student_id+book_id+plan_id → 스케줄에 따라 자동 생성된 "정기 숙제"
alter table photo_homework
  add column if not exists student_id uuid references auth.users(id),
  add column if not exists book_id uuid references homework_books(id),
  add column if not exists unit_index int,
  add column if not exists plan_id uuid references student_homework_plans(id);

create index if not exists idx_photo_homework_student on photo_homework(student_id);
create index if not exists idx_student_homework_plans_student on student_homework_plans(student_id);

-- ── RLS ─────────────────────────────────────────────────────────────
-- homework_book_units에는 정답지가 그대로 들어있으므로 학생이 절대 직접
-- 읽을 수 없어야 한다 (학생 화면은 이 테이블이 아니라 photo_homework만 본다).
-- 관리자 쪽 코드는 전부 getServiceSupabase()(service role)를 쓰므로 RLS를
-- 걸어도 admin 기능은 전혀 영향받지 않는다.

alter table homework_books enable row level security;
alter table homework_book_units enable row level security;
alter table student_homework_plans enable row level security;

drop policy if exists "homework_books_admin_all" on homework_books;
create policy "homework_books_admin_all"
  on homework_books
  for all
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "homework_book_units_admin_all" on homework_book_units;
create policy "homework_book_units_admin_all"
  on homework_book_units
  for all
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "student_homework_plans_admin_all" on student_homework_plans;
create policy "student_homework_plans_admin_all"
  on student_homework_plans
  for all
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

-- 학생은 자기 자신의 페이스 플랜만 읽을 수 있다 (쓰기는 관리자 전용).
drop policy if exists "student_homework_plans_select_own" on student_homework_plans;
create policy "student_homework_plans_select_own"
  on student_homework_plans
  for select
  using (auth.uid() = student_id);
