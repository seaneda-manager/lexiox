-- Grammar 2026 모듈 핵심 스키마
-- 기존 grammar_units(payload JSONB 덩어리)와 분리된 독립 테이블

-- 유닛 (챕터)
create table if not exists grammar_2026_units (
  id          text primary key,  -- e.g. "noun-pronoun-agreement"
  label_ko    text not null,     -- "명사-대명사 수일치"
  label_en    text not null,     -- "Noun-Pronoun Agreement"
  description text,
  level       text not null default 'all',  -- 'ms' | 'hs' | 'toefl' | 'all'
  order_index integer not null default 0,
  status      text not null default 'draft',  -- 'draft' | 'published'
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- 설명 세그먼트 (애니메이션 + 빈칸 구성, 순차 재생)
create table if not exists grammar_2026_explanation_segments (
  id          uuid primary key default gen_random_uuid(),
  unit_id     text not null references grammar_2026_units(id) on delete cascade,
  order_index integer not null,
  type        text not null,  -- 'text' | 'animation' | 'blank'
  content     jsonb not null default '{}'::jsonb,
  -- text:      { "text": "주어와 동사는 수가 일치해야 한다." }
  -- animation: { "key": "subject-verb-agreement", "duration_ms": 2000 }
  -- blank:     { "prompt": "주어가 단수이면 동사도 ___해야 한다.", "answer": "단수", "hint_ko": "단수/복수" }
  created_at  timestamptz default now()
);

-- 드릴 문제
create table if not exists grammar_2026_drills (
  id            uuid primary key default gen_random_uuid(),
  unit_id       text not null references grammar_2026_units(id) on delete cascade,
  order_index   integer not null,
  type          text not null,  -- 'judgment' | 'fill' | 'reorder' | 'correction' | 'listen_judge'
  sentence      text not null,
  answer        text not null,
  distractors   jsonb not null default '[]'::jsonb,  -- string[]
  grammar_labels jsonb not null default '[]'::jsonb,
  -- [{ id, label_ko, label_en, is_correct }]
  -- is_correct: true인 것이 정답 레이블, 나머지 3개는 오답 레이블
  audio_url     text,  -- listen_judge 타입용
  created_at    timestamptz default now()
);

-- Stylistic 문제 (챕터당 1~2개)
create table if not exists grammar_2026_stylistic_items (
  id          uuid primary key default gen_random_uuid(),
  unit_id     text not null references grammar_2026_units(id) on delete cascade,
  order_index integer not null default 0,
  skill       text not null,  -- 'concision' | 'parallelism' | 'transition' | 'modifier' | 'redundancy' | 'tone' | 'cohesion'
  prompt      text not null,
  options     jsonb not null default '[]'::jsonb,  -- [{ id, text, is_correct }]
  explanation text not null default '',
  created_at  timestamptz default now()
);

-- 학생 응답 로그
create table if not exists grammar_2026_student_responses (
  id               uuid primary key default gen_random_uuid(),
  student_id       uuid not null references auth.users(id) on delete cascade,
  drill_id         uuid not null references grammar_2026_drills(id) on delete cascade,
  answer_correct   boolean not null,
  label_correct    boolean,          -- null이면 레이블 미선택
  selected_answer  text,
  selected_label_id text,
  accordion_opened boolean not null default false,
  created_at       timestamptz default now()
);

-- 인덱스
create index if not exists idx_grammar_2026_segments_unit on grammar_2026_explanation_segments(unit_id, order_index);
create index if not exists idx_grammar_2026_drills_unit on grammar_2026_drills(unit_id, order_index);
create index if not exists idx_grammar_2026_stylistic_unit on grammar_2026_stylistic_items(unit_id);
create index if not exists idx_grammar_2026_responses_student on grammar_2026_student_responses(student_id, drill_id);

-- RLS
alter table grammar_2026_units enable row level security;
alter table grammar_2026_explanation_segments enable row level security;
alter table grammar_2026_drills enable row level security;
alter table grammar_2026_stylistic_items enable row level security;
alter table grammar_2026_student_responses enable row level security;

-- 공개 읽기 (로그인 사용자)
drop policy if exists "auth users read grammar units" on grammar_2026_units;
create policy "auth users read grammar units" on grammar_2026_units for select to authenticated using (true);
drop policy if exists "auth users read segments" on grammar_2026_explanation_segments;
create policy "auth users read segments" on grammar_2026_explanation_segments for select to authenticated using (true);
drop policy if exists "auth users read drills" on grammar_2026_drills;
create policy "auth users read drills" on grammar_2026_drills for select to authenticated using (true);
drop policy if exists "auth users read stylistic" on grammar_2026_stylistic_items;
create policy "auth users read stylistic" on grammar_2026_stylistic_items for select to authenticated using (true);

-- 학생 응답: 본인 것만 읽기/쓰기
drop policy if exists "students read own responses" on grammar_2026_student_responses;
create policy "students read own responses" on grammar_2026_student_responses for select to authenticated using (auth.uid() = student_id);
drop policy if exists "students insert own responses" on grammar_2026_student_responses;
create policy "students insert own responses" on grammar_2026_student_responses for insert to authenticated with check (auth.uid() = student_id);
