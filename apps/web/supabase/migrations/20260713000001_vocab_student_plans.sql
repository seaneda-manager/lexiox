-- =====================================================================
-- student_vocab_plans – 학생별 vocab track 학습 계획
-- =====================================================================

create table if not exists public.student_vocab_plans (
  id uuid primary key default gen_random_uuid(),

  student_id uuid not null,  -- academy_students.id
  track_id uuid not null,    -- vocab_tracks.id

  -- 학습 스케줄
  start_date text not null,  -- YYYY-MM-DD 형식
  weekdays integer[] not null default array[1,2,3,4,5],  -- 1=Mon ~ 7=Sun

  -- 용량/진도 관리
  max_active_sets integer not null default 1,  -- 동시에 열 수 있는 세트 수
  start_day_index integer not null default 1,  -- Day 1부터 시작
  cursor_day_index integer,  -- 현재 어디까지 했는지

  is_enabled boolean not null default true,
  is_paused boolean not null default false,
  paused_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- 복합 유니크 인덱스: 학생당 트랙은 1개씩만
  unique (student_id, track_id)
);

create index if not exists idx_student_vocab_plans_student_id
  on public.student_vocab_plans (student_id);

create index if not exists idx_student_vocab_plans_track_id
  on public.student_vocab_plans (track_id);

-- =====================================================================
-- student_vocab_assignments – 학생별 개별 Day 할당
-- =====================================================================

create table if not exists public.student_vocab_assignments (
  id uuid primary key default gen_random_uuid(),

  student_id uuid not null,  -- academy_students.id
  track_id uuid not null,    -- vocab_tracks.id
  day_index integer not null,  -- Day 1, 2, 3, ...
  set_id uuid not null,      -- vocab_sets.id

  status text not null default 'ASSIGNED',  -- ASSIGNED, STARTED, COMPLETED, SKIPPED

  available_at text not null,  -- YYYY-MM-DD 오픈 예정일
  assigned_at timestamptz,  -- 실제 할당된 시간
  started_at timestamptz,   -- 학생이 시작한 시간
  completed_at timestamptz, -- 학생이 완료한 시간

  note text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_student_vocab_assignments_student_id
  on public.student_vocab_assignments (student_id);

create index if not exists idx_student_vocab_assignments_track_id
  on public.student_vocab_assignments (track_id);

create index if not exists idx_student_vocab_assignments_status
  on public.student_vocab_assignments (status);

create index if not exists idx_student_vocab_assignments_available_at
  on public.student_vocab_assignments (available_at);
