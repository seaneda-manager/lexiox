-- 1) Study 세션 기록: 학생이 Assisted Study 모드로 한 번 푼 기록
create table if not exists study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,

  -- 기존 reading_sets.id가 text라고 가정했지만,
  -- 현재 reading_sets 테이블이 없으므로 FK 없이 텍스트만 저장
  set_id text not null,

  answers jsonb not null,        -- {questionId: choiceId}
  incorrect jsonb,               -- ["q1", "q3", ...]
  unknown_vocab jsonb,           -- ["derive", "allocate", ...]
  created_at timestamptz default now()
);

-- 2) Review 아이템: 오답/중요 문항의 근거/해설/영상 링크
create table if not exists review_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references study_sessions(id) on delete cascade,

  -- 기존에는 reading_questions FK였지만, 지금은 의존성 제거
  question_id text not null,

  reference_text text,      -- 근거 문장 원문
  reference_kor text,       -- 근거 문장 해석
  explanation text,         -- 정답/오답 이유
  video_url text,           -- 쇼츠 강의 링크(선택)
  created_at timestamptz default now()
);

-- 3) Daily Task: paraphrase / 구조 분석 / 해석 과제
create table if not exists daily_tasks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references study_sessions(id) on delete cascade,
  user_id uuid not null,
  paraphrase text,
  analysis text,
  translation text,
  created_at timestamptz default now()
);

-- 4) Vocab 아이템: 학생별 누적 단어장
create table if not exists vocab_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  word text not null,
  origin_session uuid references study_sessions(id) on delete cascade,
  mastered boolean default false,
  created_at timestamptz default now()
);

-- 5) Test 세션: 실전 Test Mode 기록
create table if not exists test_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,

  -- 기존에는 reading_sets FK, 지금은 텍스트 ID만 저장
  set_id text not null,

  answers jsonb,
  score int,
  created_at timestamptz default now()
);

-- 조회용 인덱스
create index if not exists idx_study_sessions_user_id
  on study_sessions(user_id);

create index if not exists idx_study_sessions_set_id
  on study_sessions(set_id);

create index if not exists idx_review_items_session_id
  on review_items(session_id);

create index if not exists idx_daily_tasks_user_id
  on daily_tasks(user_id);

create index if not exists idx_vocab_items_user_id
  on vocab_items(user_id);

-- ⚠ test_sessions.user_id 컬럼이 실제로 있을 때만 인덱스 생성
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'test_sessions'
      and column_name  = 'user_id'
  ) then
    create index if not exists idx_test_sessions_user_id
      on test_sessions(user_id);
  end if;
end
$$;
