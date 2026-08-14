-- ─────────────────────────────────────────────────────────────
-- Vocab Test Taker System
-- 학습 완료 후 시험을 보는 시스템
-- ─────────────────────────────────────────────────────────────

-- ── 1. 시험 설정 (레벨별, Class별, Student별) ──────────────────
create table if not exists vocab_test_configs (
  id                text primary key default gen_random_uuid()::text,

  -- 적용 범위: global | class | student
  scope             text not null check (scope in ('global', 'class', 'student')),
  scope_id          text,  -- class_id 또는 student_id (scope가 global이면 null)

  -- 문제 포함 범위 (70 = 전체 단어의 70% 이상)
  coverage_ratio    integer not null default 70 check (coverage_ratio between 30 and 100),

  -- 문제 배열 방식: grouped | random
  arrangement       text not null default 'random' check (arrangement in ('grouped', 'random')),

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ── 2. 시험 세션 ──────────────────────────────────────────────
create table if not exists vocab_test_sessions (
  id                text primary key default gen_random_uuid()::text,

  student_id        uuid not null references auth.users(id) on delete cascade,
  class_id          text not null,  -- 학원 Class
  track_id          text not null,  -- Vocab Track ID
  day_number        integer not null,  -- Day 번호

  -- 시험 범위
  total_words_count integer not null,  -- 해당 Day의 전체 단어 수
  words_count       integer not null,  -- 실제 시험에 포함된 단어 수

  -- 옵션
  use_wrong_only    boolean not null default false,  -- "틀린 것만 보기" 사용 여부

  -- 시험 상태
  status            text not null default 'not_started' check (
    status in ('not_started', 'in_progress', 'submitted', 'graded')
  ),

  -- 결과
  score             integer,  -- 0~100
  correct_count     integer,
  total_count       integer,

  -- 소요 시간 (초)
  duration_seconds  integer,

  started_at        timestamptz,
  submitted_at      timestamptz,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ── 3. 시험 문제 ──────────────────────────────────────────────
create table if not exists vocab_test_questions (
  id                text primary key default gen_random_uuid()::text,

  session_id        text not null references vocab_test_sessions(id) on delete cascade,
  question_number   integer not null,  -- 시험 내 문제 순번

  word_id           text not null,  -- Vocab word ID
  word_text         text not null,

  -- 문제 유형: word_to_meaning | meaning_to_word | synonym | listening
  question_type     text not null check (
    question_type in ('word_to_meaning', 'meaning_to_word', 'synonym', 'listening')
  ),

  -- 객관식 선택지 (synonym, listening)
  options           jsonb,  -- [{ id, text/audio_url, is_correct }]

  -- 정답
  correct_answer    text not null,  -- 주관식: 단어, 객관식: option_id

  -- 한국어 뜻 (주관식용)
  meaning_ko        text[],

  -- 오디오 URL (listening)
  audio_url         text,

  -- 학생 답변
  student_answer    text,
  is_correct        boolean,

  created_at        timestamptz not null default now()
);

-- ── 4. 인덱스 ─────────────────────────────────────────────────
create index if not exists idx_vocab_test_sessions_student on vocab_test_sessions(student_id);
create index if not exists idx_vocab_test_sessions_class on vocab_test_sessions(class_id);
create index if not exists idx_vocab_test_sessions_track_day on vocab_test_sessions(track_id, day_number);
create index if not exists idx_vocab_test_questions_session on vocab_test_questions(session_id);

-- ── 5. RLS (행 수준 보안) ──────────────────────────────────────
alter table vocab_test_configs enable row level security;
alter table vocab_test_sessions enable row level security;
alter table vocab_test_questions enable row level security;

-- RLS Policy: 학생은 자신의 세션만 조회
create policy "students_can_read_own_sessions" on vocab_test_sessions
  for select using (auth.uid() = student_id);

create policy "students_can_read_own_questions" on vocab_test_questions
  for select using (
    session_id in (
      select id from vocab_test_sessions where student_id = auth.uid()
    )
  );

-- RLS Policy: Admin/Superadmin은 전체 조회
create policy "admins_can_read_all_sessions" on vocab_test_sessions
  for select using (
    exists (
      select 1 from user_roles
      where user_id = auth.uid() and role in ('admin', 'superadmin')
    )
  );

create policy "admins_can_insert_sessions" on vocab_test_sessions
  for insert with check (
    exists (
      select 1 from user_roles
      where user_id = auth.uid() and role in ('admin', 'superadmin')
    )
  );

create policy "students_can_insert_own_sessions" on vocab_test_sessions
  for insert with check (auth.uid() = student_id);

create policy "students_can_update_own_sessions" on vocab_test_sessions
  for update using (auth.uid() = student_id)
  with check (auth.uid() = student_id);
