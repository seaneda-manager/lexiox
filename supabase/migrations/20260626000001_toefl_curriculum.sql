-- TOEFL 커리큘럼 구조
-- 챕터는 스킬+순서로 정의, 레벨(기본/중급/고급)별로 난이도만 다름

create type toefl_skill as enum ('reading', 'listening', 'speaking', 'writing');
create type toefl_level as enum ('basic', 'intermediate', 'advanced');
create type toefl_content_type as enum ('lecture', 'practice', 'test', 'drill');
create type toefl_student_mode as enum ('learning', 'exam');

-- 챕터 정의 (레벨 무관, 스킬별 순서)
create table toefl_chapters (
  id          uuid primary key default gen_random_uuid(),
  skill       toefl_skill not null,
  order_num   int not null,
  title       text not null,                 -- e.g. "Main Idea"
  focus_type  text,                          -- e.g. "main_idea", "detail", "inference"
  description text,
  created_at  timestamptz default now(),
  unique (skill, order_num)
);

-- 챕터별 레벨별 콘텐츠 (강좌/Practices/Test/Drill)
create table toefl_chapter_content (
  id              uuid primary key default gen_random_uuid(),
  chapter_id      uuid not null references toefl_chapters(id) on delete cascade,
  level           toefl_level not null,
  content_type    toefl_content_type not null,
  order_num       int not null default 0,
  title           text,
  content_ref_id  uuid,          -- 연결된 콘텐츠 ID (강좌/지문/시험 등)
  content_ref_table text,        -- 'lectures', 'reading_tests_2026', etc.
  notes           text,
  created_at      timestamptz default now()
);

create index on toefl_chapter_content (chapter_id, level, content_type);

-- 학생별 스킬별 현재 레벨 + 모드
create table toefl_student_level (
  student_id    uuid not null references auth.users(id) on delete cascade,
  skill         toefl_skill not null,
  current_level toefl_level not null default 'basic',
  mode          toefl_student_mode not null default 'learning',
  updated_at    timestamptz default now(),
  primary key (student_id, skill)
);

-- 레벨 테스트 결과
create table toefl_level_results (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references auth.users(id) on delete cascade,
  skill        toefl_skill not null,
  level        toefl_level not null,
  score        numeric(5,2),          -- 0~100
  passed       boolean not null default false,
  tested_at    timestamptz default now()
);

create index on toefl_level_results (student_id, skill, level);

-- 학생 챕터 진행 상태
create table toefl_student_progress (
  student_id   uuid not null references auth.users(id) on delete cascade,
  chapter_id   uuid not null references toefl_chapters(id) on delete cascade,
  level        toefl_level not null,
  -- 단계별 완료 여부
  lecture_done   boolean not null default false,
  practice_done  boolean not null default false,
  test_done      boolean not null default false,
  review_done    boolean not null default false,
  drill_done     boolean not null default false,
  completed_at   timestamptz,
  updated_at     timestamptz default now(),
  primary key (student_id, chapter_id, level)
);

-- RLS
alter table toefl_chapters         enable row level security;
alter table toefl_chapter_content  enable row level security;
alter table toefl_student_level    enable row level security;
alter table toefl_level_results    enable row level security;
alter table toefl_student_progress enable row level security;

-- 챕터/콘텐츠 정의는 누구나 읽기 가능 (로그인 필요)
create policy "auth read chapters"        on toefl_chapters        for select using (auth.role() = 'authenticated');
create policy "auth read chapter_content" on toefl_chapter_content for select using (auth.role() = 'authenticated');

-- 학생 데이터는 본인만
create policy "student read own level"    on toefl_student_level    for select using (auth.uid() = student_id);
create policy "student read own progress" on toefl_student_progress for select using (auth.uid() = student_id);
create policy "student read own results"  on toefl_level_results    for select using (auth.uid() = student_id);
create policy "student write own level"   on toefl_student_level    for insert with check (auth.uid() = student_id);
create policy "student update own level"  on toefl_student_level    for update using (auth.uid() = student_id);
create policy "student write own progress" on toefl_student_progress for insert with check (auth.uid() = student_id);
create policy "student update own progress" on toefl_student_progress for update using (auth.uid() = student_id);
create policy "student write own results" on toefl_level_results    for insert with check (auth.uid() = student_id);

-- 어드민/선생님은 service_role로 처리 (별도 API route 경유)
