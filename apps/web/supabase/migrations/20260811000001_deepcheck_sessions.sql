-- DeepCheck: 학생이 선생님과의 하브루타식 세션 전에 준비하는 체크리스트.
-- 중심개념/약점/강점(자랑거리)/영어로 설명해보기 + 다룰 스킬(문법에만 치우치지 않게 듣기/읽기/말하기 포함).

create table if not exists deepcheck_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id),
  core_concepts text[] not null default '{}',
  weaknesses text[] not null default '{}',
  strengths text[] not null default '{}',
  english_explanation text,
  skills_covered text[] not null default '{}', -- reading | listening | speaking | writing | grammar | vocab 부분집합
  status text not null default 'draft', -- draft | ready | completed
  teacher_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_deepcheck_sessions_student on deepcheck_sessions(student_id);

alter table deepcheck_sessions enable row level security;

create policy "deepcheck_sessions_select_own"
  on deepcheck_sessions for select
  using (auth.uid() = student_id);

create policy "deepcheck_sessions_insert_own"
  on deepcheck_sessions for insert
  with check (auth.uid() = student_id);

create policy "deepcheck_sessions_update_own"
  on deepcheck_sessions for update
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

create policy "deepcheck_sessions_admin_all"
  on deepcheck_sessions for all
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));
