-- ─────────────────────────────────────────────────────────────
-- 문법 퀴즈 뱅크 (Phase 1)
-- 선생님이 조건(레벨/문법요소/유형/단어수/어휘수준)으로 골라
-- 학생에게 시험으로 배정하기 위한 문항 풀 + 문법 요소 카탈로그.
-- ─────────────────────────────────────────────────────────────

-- ── 1. 문법 요소 카탈로그 ─────────────────────────────────────
create table if not exists grammar_elements (
  code        text primary key,
  label_ko    text not null,
  label_en    text not null,
  category    text not null,              -- '수일치','관계사','시제','조동사',...
  order_index integer not null default 0,
  created_at  timestamptz not null default now()
);

-- ── 2. 문법 퀴즈 문항 풀 ─────────────────────────────────────
create table if not exists grammar_quiz_items (
  id              uuid primary key default gen_random_uuid(),
  stem            text not null,          -- 빈칸(___) 포함 문장 / 판단 대상 문장
  item_type       text not null check (item_type in ('fill','judgment')),
  answer          text not null,          -- fill=정답단어 · judgment='correct'|'incorrect'
  distractors     jsonb not null default '[]'::jsonb,
  element_code    text references grammar_elements(code) on delete set null,
  track           text not null check (track in ('updated-toefl','jr','middle','high')),
  word_count      integer not null default 0,
  vocab_level     integer not null default 3 check (vocab_level between 1 and 5),
  explanation     text,
  source          text not null default 'ai' check (source in ('ai','manual','import')),
  origin_drill_id uuid,
  status          text not null default 'active' check (status in ('active','archived')),
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_gqi_filter
  on grammar_quiz_items(track, item_type, element_code, vocab_level, word_count);
create index if not exists idx_gqi_status on grammar_quiz_items(status);
create unique index if not exists uq_gqi_origin
  on grammar_quiz_items(origin_drill_id) where origin_drill_id is not null;

-- ── 3. RLS ──────────────────────────────────────────────────
-- 읽기만 공개. 쓰기는 서비스롤 전용 (grammar_2026_* 패턴과 동일).
alter table grammar_elements   enable row level security;
alter table grammar_quiz_items enable row level security;

drop policy if exists "ge_read_all" on grammar_elements;
create policy "ge_read_all" on grammar_elements for select using (true);

drop policy if exists "gqi_read_active" on grammar_quiz_items;
create policy "gqi_read_active" on grammar_quiz_items for select using (status = 'active');
