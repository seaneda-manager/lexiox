-- 게임 배정(선생님 → 학생) + 플레이 시도 기록.
-- student_id 는 academy_students.id (단어 숙제 표와 같은 기준). 서비스 롤로만 읽고 쓴다(RLS 켬, 정책 없음).
-- 수동 적용: supabase db query --linked -f supabase/migrations/20261116000002_game_assignments.sql

create table if not exists public.game_assignments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null,
  style text not null,
  set_id uuid,
  mode text not null default 'en-en',
  level text not null default 'normal',
  target_plays int not null default 1 check (target_plays between 1 and 20),
  due_date date,
  note text,
  assigned_by uuid,
  created_at timestamptz not null default now(),
  cancelled_at timestamptz
);

create index if not exists game_assignments_student_idx on public.game_assignments (student_id, created_at desc);

create table if not exists public.game_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null,
  assignment_id uuid references public.game_assignments(id) on delete set null,
  style text not null,
  set_id uuid,
  mode text,
  level text,
  correct int not null default 0,
  total int not null default 0,
  score int not null default 0,
  detail jsonb,
  created_at timestamptz not null default now()
);

create index if not exists game_attempts_student_idx on public.game_attempts (student_id, created_at desc);
create index if not exists game_attempts_assignment_idx on public.game_attempts (assignment_id);

alter table public.game_assignments enable row level security;
alter table public.game_attempts enable row level security;
revoke all on public.game_assignments from anon, authenticated;
revoke all on public.game_attempts from anon, authenticated;
