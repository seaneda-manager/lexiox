-- 학원용 단어 숙달 사이클 (1/2): 추가만 하는 스키마 변경
-- 시험 설정(통과점수·제한시간), 세션(종류·회차·마감시각·통과여부), 단어별 숙달 기록, 필수 재학습 배정.
-- 운영 DB에는 SQL Editor에서 이미 적용됨. 재실행해도 안전하도록 if not exists 를 사용한다.

-- 1. 시험 설정
alter table public.vocab_test_configs
  add column if not exists pass_score            smallint not null default 80 check (pass_score between 1 and 100),
  add column if not exists seconds_per_question  smallint not null default 6  check (seconds_per_question between 2 and 60),
  add column if not exists max_total_minutes     smallint not null default 15 check (max_total_minutes between 1 and 60),
  add column if not exists enable_listen_spell   boolean  not null default false;
alter table public.vocab_test_configs alter column coverage_ratio set default 100;

-- 2. 시험 세션
alter table public.vocab_test_sessions
  add column if not exists kind               text not null default 'main' check (kind in ('main','retest')),
  add column if not exists attempt_no         smallint not null default 1,
  add column if not exists assignment_id      uuid references public.student_vocab_assignments(id) on delete set null,
  add column if not exists academy_student_id uuid references public.academy_students(id) on delete set null,
  add column if not exists deadline_at        timestamptz,
  add column if not exists pass_score         smallint,
  add column if not exists passed             boolean,
  add column if not exists ended_by           text check (ended_by in ('submit','timeout'));

create index if not exists idx_vts_open_deadline
  on public.vocab_test_sessions (deadline_at) where status = 'in_progress';
create index if not exists idx_vts_assignment
  on public.vocab_test_sessions (assignment_id);
create unique index if not exists uq_vts_assignment_kind_attempt
  on public.vocab_test_sessions (assignment_id, kind, attempt_no) where assignment_id is not null;

-- 3. 문제 유형: 듣고 철자&뜻
alter table public.vocab_test_questions drop constraint if exists vocab_test_questions_question_type_check;
alter table public.vocab_test_questions add constraint vocab_test_questions_question_type_check
  check (question_type in ('word_to_meaning','meaning_to_word','synonym','listening','listen_spell'));

-- 4. 학생×단어 숙달 기록
create table if not exists public.vocab_word_mastery (
  student_id     uuid not null references public.academy_students(id) on delete cascade,
  word_id        uuid not null references public.words(id) on delete cascade,
  last_result    boolean,
  correct_streak smallint not null default 0,
  wrong_count    integer  not null default 0,
  seen_count     integer  not null default 0,
  last_tested_at timestamptz,
  next_review_at timestamptz,
  updated_at     timestamptz not null default now(),
  primary key (student_id, word_id)
);
create index if not exists idx_vwm_student_review on public.vocab_word_mastery (student_id, next_review_at);

-- 5. 필수 재학습 배정
create table if not exists public.vocab_remedial_tasks (
  id                uuid primary key default gen_random_uuid(),
  student_id        uuid not null references public.academy_students(id) on delete cascade,
  track_id          uuid not null references public.vocab_tracks(id) on delete cascade,
  day_index         integer not null check (day_index >= 1),
  source_session_id text not null unique references public.vocab_test_sessions(id) on delete cascade,
  status            text not null default 'open' check (status in ('open','in_progress','done','cancelled')),
  word_ids          uuid[] not null default '{}',
  extra_terms       text[] not null default '{}',     -- 파생어(문자열)
  reasons           jsonb  not null default '{}',     -- {"<word_id>":"wrong|hard|derived"}
  due_at            date,
  completed_at      timestamptz,
  retest_session_id text references public.vocab_test_sessions(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_vrt_student_status on public.vocab_remedial_tasks (student_id, status);

-- 새 테이블: 쓰기는 서버(service role)만, 읽기는 교사/관리자
alter table public.vocab_word_mastery   enable row level security;
alter table public.vocab_remedial_tasks enable row level security;
drop policy if exists staff_read_mastery on public.vocab_word_mastery;
create policy staff_read_mastery on public.vocab_word_mastery for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','teacher')));
drop policy if exists staff_read_remedial on public.vocab_remedial_tasks;
create policy staff_read_remedial on public.vocab_remedial_tasks for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','teacher')));
