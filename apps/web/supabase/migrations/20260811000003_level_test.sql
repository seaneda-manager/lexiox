-- 학생 레벨 테스트: 신규 배치 + 주기적 재평가 겸용. 문법/어휘/듣기/읽기/말하기 5영역.
-- 문법/어휘/듣기/읽기는 객관식 자동채점, 말하기는 녹음 제출 후 선생님이 검토해서
-- recommended_level(= homework_books.level과 매칭되는 자유 텍스트)을 정해준다.

create table if not exists level_test_questions (
  id uuid primary key default gen_random_uuid(),
  section text not null check (section in ('grammar', 'vocab', 'listening', 'reading', 'speaking')),
  order_index int not null default 0,
  prompt text not null,
  passage_text text,       -- reading 전용
  audio_url text,          -- listening 전용
  choices jsonb,           -- [{id,text}] — speaking은 null(주관식/녹음)
  correct_choice_id text,  -- 객관식 정답. 학생에게 절대 노출되면 안 됨.
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists level_test_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id),
  status text not null default 'in_progress', -- in_progress | completed
  section_scores jsonb not null default '{}'::jsonb, -- {grammar: pct, vocab: pct, listening: pct, reading: pct}
  recommended_level text,
  teacher_notes text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists level_test_responses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references level_test_sessions(id) on delete cascade,
  student_id uuid not null references auth.users(id),
  question_id uuid not null references level_test_questions(id),
  response_choice_id text,
  response_audio_url text,
  is_correct boolean, -- speaking은 null (자동채점 대상 아님)
  created_at timestamptz not null default now(),
  unique (session_id, question_id)
);

create index if not exists idx_level_test_responses_session on level_test_responses(session_id);
create index if not exists idx_level_test_sessions_student on level_test_sessions(student_id);

alter table level_test_questions enable row level security;
alter table level_test_sessions enable row level security;
alter table level_test_responses enable row level security;

-- 문제은행에는 정답이 그대로 들어있으므로 학생은 절대 직접 조회할 수 없다.
-- 학생에게 보여주는 화면은 서버 컴포넌트가 service role로 읽어 정답 필드를 제거한 뒤 내려준다.
drop policy if exists "level_test_questions_admin_all" on level_test_questions;
create policy "level_test_questions_admin_all"
  on level_test_questions for all
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "level_test_sessions_select_own" on level_test_sessions;
create policy "level_test_sessions_select_own"
  on level_test_sessions for select using (auth.uid() = student_id);
drop policy if exists "level_test_sessions_insert_own" on level_test_sessions;
create policy "level_test_sessions_insert_own"
  on level_test_sessions for insert with check (auth.uid() = student_id);
drop policy if exists "level_test_sessions_update_own" on level_test_sessions;
create policy "level_test_sessions_update_own"
  on level_test_sessions for update using (auth.uid() = student_id) with check (auth.uid() = student_id);
drop policy if exists "level_test_sessions_admin_all" on level_test_sessions;
create policy "level_test_sessions_admin_all"
  on level_test_sessions for all
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "level_test_responses_select_own" on level_test_responses;
create policy "level_test_responses_select_own"
  on level_test_responses for select using (auth.uid() = student_id);
drop policy if exists "level_test_responses_insert_own" on level_test_responses;
create policy "level_test_responses_insert_own"
  on level_test_responses for insert with check (auth.uid() = student_id);
drop policy if exists "level_test_responses_admin_all" on level_test_responses;
create policy "level_test_responses_admin_all"
  on level_test_responses for all
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));
