-- =====================================================================
-- STEP 0: 확장 & ENUM 타입 정의
-- =====================================================================

-- UUID 생성용
create extension if not exists "pgcrypto";

-- 학년/발달 단계 enum
do $$
begin
  if not exists (select 1 from pg_type where typname = 'grade_band') then
    create type grade_band as enum (
      'K1_2',      -- 초1~2
      'K3_4',      -- 초3~4
      'K5_6',      -- 초5~6
      'K7_9',      -- 중1~3
      'K10_12',    -- 고1~3
      'POST_K12'   -- 성인/대학생/시험용
    );
  end if;
end$$;

-- 단어 출처 타입 enum (내신/수능/모고/EBS/TOEFL 등)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'word_source_type') then
    create type word_source_type as enum (
      'TEXTBOOK',     -- 내신 교과서
      'SCHOOL_PRINT', -- 학교 프린트/내신 자료
      'SUNEUNG',      -- 수능
      'MOGOSA',       -- 교육청/모의고사
      'EBS',          -- 수특/수완
      'TOEFL',
      'TOEIC',
      'TEPS',
      'SAT',
      'CUSTOM'        -- 기타(직접 만든 세트 등)
    );
  end if;
end$$;

-- 학생별 암기 상태 enum
do $$
begin
  if not exists (select 1 from pg_type where typname = 'knowledge_status') then
    create type knowledge_status as enum (
      'UNKNOWN',   -- 아직 안 본 단어
      'LEARNING',  -- 학습 중
      'KNOWN',     -- 어느 정도 아는 상태
      'MASTERED'   -- 거의 완벽
    );
  end if;
end$$;

-- =====================================================================
-- STEP 1: words – 단어 SSOT
-- =====================================================================

create table if not exists public.words (
  id uuid primary key default gen_random_uuid(),

  -- 기본 정보
  text text not null,           -- 표제어 (예: decline)
  lemma text,                   -- 필요 시 원형/lemma (text와 같아도 됨)
  pos text,                     -- 품사 (noun, verb, adj 등 자유 텍스트)
  is_function_word boolean not null default false, -- 기능어 여부

  -- 의미/예문 (배열)
  meanings_ko text[] not null default '{}',          -- 한글 뜻 여러 개
  meanings_en_simple text[] not null default '{}',   -- 영영 정의(쉬운 버전)
  examples_easy text[] not null default '{}',        -- 쉬운 예문 (A2~B1)
  examples_normal text[] not null default '{}',      -- 일반 예문 (B1~B2)
  derived_terms text[] not null default '{}',        -- 파생어/관련어

  -- 난이도/빈도 (알고리즘용)
  difficulty smallint,          -- 1~5 정도
  frequency_score numeric,      -- 출현 빈도 점수

  -- 기타 메타
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_words_text
  on public.words (lower(text));

-- =====================================================================
-- STEP 2: word_grade_bands – 단어 ↔ 학년/레벨 매핑
-- =====================================================================

create table if not exists public.word_grade_bands (
  word_id uuid not null references public.words(id) on delete cascade,
  grade grade_band not null,

  primary key (word_id, grade)
);

-- =====================================================================
-- STEP 3: word_sources – 수능/모고/EBS/TOEFL 등 출처
-- =====================================================================

create table if not exists public.word_sources (
  id uuid primary key default gen_random_uuid(),
  word_id uuid not null references public.words(id) on delete cascade,

  source_type word_source_type not null,  -- SUNEUNG, MOGOSA, EBS, TOEFL...

  -- 사람 눈에 보이는 라벨 (예: "2023 수능 11월 홀수 29번 지문")
  source_label text not null,

  -- 옵션: 연도/월/회차
  exam_year smallint,
  exam_month smallint,
  exam_round text,            -- "3월", "6월", "9월", "수능" 등

  grade grade_band,           -- 주 대상 학년대 (보통 K10_12)

  extra jsonb not null default '{}'::jsonb, -- 교과서명/단원명 등 추가 정보

  created_at timestamptz not null default now()
);

create index if not exists idx_word_sources_word_id
  on public.word_sources (word_id);

create index if not exists idx_word_sources_type_year
  on public.word_sources (source_type, exam_year);

-- =====================================================================
-- STEP 4: semantic_tags + word_semantic_tags – 주제/의미 클러스터
-- =====================================================================

create table if not exists public.semantic_tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,      -- 예: "environment", "economy", "feelings"
  label text not null,            -- 사람 읽기용 레이블
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.word_semantic_tags (
  word_id uuid not null references public.words(id) on delete cascade,
  tag_id uuid not null references public.semantic_tags(id) on delete cascade,

  primary key (word_id, tag_id)
);

-- =====================================================================
-- STEP 5: word_grammar_hints – 기능어/문법 포인트
-- =====================================================================

create table if not exists public.word_grammar_hints (
  id uuid primary key default gen_random_uuid(),
  word_id uuid not null references public.words(id) on delete cascade,

  grammar_category grammar_category not null default 'NONE',

  short_tip_ko text not null,   -- 초등도 이해할 수 있는 한글 팁
  short_tip_en text,            -- 필요시 간단 영어 팁
  wrong_example text,           -- 자주 하는 오답 예
  right_example text,           -- 고친 예문

  show_until_grade grade_band,  -- 예: K5_6 까지만 자동 노출

  sort_order integer not null default 0,

  created_at timestamptz not null default now()
);

create index if not exists idx_word_grammar_hints_word_id
  on public.word_grammar_hints (word_id);

-- =====================================================================
-- STEP 6: user_word_knowledge – 학생별 단어 암기/이해 상태
-- =====================================================================

create table if not exists public.user_word_knowledge (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null,  -- supabase.auth.users.id 와 연결 (FK는 나중에 옵션으로 추가)
  word_id uuid not null references public.words(id) on delete cascade,

  status knowledge_status not null default 'UNKNOWN',
  knowledge_percent smallint not null default 0,
  correct_streak smallint not null default 0,
  total_seen integer not null default 0,

  last_seen_at timestamptz,
  last_result jsonb, -- 마지막 퀴즈 결과(문항 타입, 정오답, 반응 시간 등)

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, word_id)
);

create index if not exists idx_user_word_knowledge_user
  on public.user_word_knowledge (user_id);

create index if not exists idx_user_word_knowledge_word
  on public.user_word_knowledge (word_id);

