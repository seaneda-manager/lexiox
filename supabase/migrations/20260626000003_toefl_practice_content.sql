-- TOEFL Practice 지문 + 문제 테이블
-- 챕터별 연습용 짧은 지문 (학습 모드 전용, 풀테스트와 별개)

create table toefl_practice_passages (
  id           uuid primary key default gen_random_uuid(),
  skill        toefl_skill not null default 'reading',
  level        toefl_level not null,
  focus_type   text,                    -- 'main_idea', 'detail', etc.
  title        text,                    -- 지문 제목 (선택)
  body         text not null,           -- 지문 본문
  word_count   int generated always as (
                 array_length(string_to_array(trim(body), ' '), 1)
               ) stored,
  source_notes text,                    -- 출처/제작 메모
  is_published boolean not null default false,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create table toefl_practice_questions (
  id            uuid primary key default gen_random_uuid(),
  passage_id    uuid not null references toefl_practice_passages(id) on delete cascade,
  order_num     int not null default 1,
  question_type text not null default 'multiple_choice',  -- 'multiple_choice' | 'highlight'
  stem          text not null,          -- 문제 본문
  choices       jsonb not null default '[]',  -- [{text, is_correct, explanation}]
  explanation   text,                   -- 전체 해설
  created_at    timestamptz default now()
);

create index on toefl_practice_passages (skill, level, focus_type);
create index on toefl_practice_questions (passage_id, order_num);

-- RLS
alter table toefl_practice_passages  enable row level security;
alter table toefl_practice_questions enable row level security;

-- 로그인 사용자는 published 지문만 읽기
create policy "read published passages" on toefl_practice_passages
  for select using (auth.role() = 'authenticated' and is_published = true);

create policy "read questions of published" on toefl_practice_questions
  for select using (
    auth.role() = 'authenticated' and
    exists (
      select 1 from toefl_practice_passages p
      where p.id = passage_id and p.is_published = true
    )
  );

-- 어드민/선생님 읽기 (unpublished 포함) — service_role API route 경유
