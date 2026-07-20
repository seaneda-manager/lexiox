-- lectures: 강의 메타데이터
create table if not exists lectures (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  youtube_url text not null,
  thumbnail_url text,
  duration_seconds integer,
  tags text[] default '{}',
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- lecture_quiz_questions: 타임스탬프별 빈칸 퀴즈
create table if not exists lecture_quiz_questions (
  id uuid primary key default gen_random_uuid(),
  lecture_id uuid not null references lectures(id) on delete cascade,
  timestamp_seconds integer not null, -- 영상에서 퀴즈 뜨는 시점(초)
  question_text text not null,        -- "The mitochondria is the ___ of the cell"
  blank_answer text not null,         -- 정답 (대소문자 무시 비교)
  hint text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- lecture_assignments: 학생/반 배정
create table if not exists lecture_assignments (
  id uuid primary key default gen_random_uuid(),
  lecture_id uuid not null references lectures(id) on delete cascade,
  student_id uuid references auth.users(id),
  class_id uuid,
  due_at timestamptz,
  assigned_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- lecture_completions: 학생 시청 완료 기록
create table if not exists lecture_completions (
  id uuid primary key default gen_random_uuid(),
  lecture_id uuid not null references lectures(id) on delete cascade,
  student_id uuid not null references auth.users(id),
  completed_at timestamptz not null default now(),
  quiz_score integer,   -- 맞힌 퀴즈 수
  quiz_total integer,   -- 전체 퀴즈 수
  unique(lecture_id, student_id)
);

-- lecture_quiz_attempts: 퀴즈 답변 기록
create table if not exists lecture_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references lecture_quiz_questions(id) on delete cascade,
  student_id uuid not null references auth.users(id),
  lecture_id uuid not null references lectures(id) on delete cascade,
  answer text not null,
  is_correct boolean not null,
  attempted_at timestamptz not null default now()
);

-- RLS
alter table lectures enable row level security;
alter table lecture_quiz_questions enable row level security;
alter table lecture_assignments enable row level security;
alter table lecture_completions enable row level security;
alter table lecture_quiz_attempts enable row level security;

-- 어드민/선생님은 모두 읽기/쓰기
create policy "admin_all_lectures" on lectures for all using (true) with check (true);
create policy "admin_all_quiz_questions" on lecture_quiz_questions for all using (true) with check (true);
create policy "admin_all_lecture_assignments" on lecture_assignments for all using (true) with check (true);
create policy "admin_all_lecture_completions" on lecture_completions for all using (true) with check (true);
create policy "admin_all_lecture_quiz_attempts" on lecture_quiz_attempts for all using (true) with check (true);
