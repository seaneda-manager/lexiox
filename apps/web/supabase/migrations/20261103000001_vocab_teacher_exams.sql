-- ─────────────────────────────────────────────────────────────
-- 선생님 출제 단어 시험 (범위 · 문항 수 · 유형 지정, 온라인 응시 + 프린트)
-- 문제는 출제 시점에 스냅샷으로 저장해 시험지(프린트)와 온라인 응시가 같은 문제를 쓴다.
-- 학생 응시는 기존 vocab_test_sessions/questions 흐름을 그대로 재사용한다(exam_id 로 연결).
-- ─────────────────────────────────────────────────────────────

create table if not exists vocab_teacher_exams (
  id              text primary key default gen_random_uuid()::text,
  created_by      uuid not null references auth.users(id) on delete cascade,
  title           text not null,

  -- 범위: 트랙의 Day 구간 (vocab_sets.track_id + order_index)
  track_id        text not null,
  day_from        integer not null check (day_from >= 1),
  day_to          integer not null check (day_to >= day_from),

  question_count  integer not null check (question_count between 1 and 200),
  question_types  text[] not null,
  arrangement     text not null default 'grouped' check (arrangement in ('grouped', 'random')),

  -- 출제된 문제 스냅샷 (VocabTestQuestion 배열, session_id 는 비어 있음)
  questions       jsonb not null default '[]'::jsonb,

  created_at      timestamptz not null default now()
);

create index if not exists idx_vocab_teacher_exams_created_by on vocab_teacher_exams(created_by);

-- 응시 대상 학생 (student_id = auth uid, vocab_test_sessions.student_id 와 동일 기준)
create table if not exists vocab_teacher_exam_targets (
  exam_id     text not null references vocab_teacher_exams(id) on delete cascade,
  student_id  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (exam_id, student_id)
);

create index if not exists idx_vocab_teacher_exam_targets_student on vocab_teacher_exam_targets(student_id);

-- 세션 ↔ 시험 연결
alter table vocab_test_sessions add column if not exists exam_id text references vocab_teacher_exams(id) on delete set null;
create index if not exists idx_vocab_test_sessions_exam on vocab_test_sessions(exam_id);

-- 접근은 전부 서버(service role) API 를 거친다. 정책 없이 RLS 만 켜서 클라이언트 직접 접근을 막는다.
alter table vocab_teacher_exams enable row level security;
alter table vocab_teacher_exam_targets enable row level security;
