-- ✅ UUID 생성용
create extension if not exists "pgcrypto";

-- ✅ 학년/발달 단계 (우리가 말한 K1-2, K3-4, ...)
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

-- ✅ 문법 카테고리 (기능어/문법 힌트용)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'grammar_category') then
    create type grammar_category as enum (
      'NONE',
      'BE_VERB',
      'GENERAL_VERB',
      'PRONOUN',
      'ARTICLE',
      'PREPOSITION',
      'CONJUNCTION',
      'RELATIVE_PRONOUN'
    );
  end if;
end$$;

-- ✅ 출처 타입 (내신/수능/모고/EBS/TOEFL 등)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'word_source_type') then
    create type word_source_type as enum (
      'TEXTBOOK',    -- 내신 교과서
      'SCHOOL_PRINT',-- 학교 프린트/내신 자료
      'SUNEUNG',     -- 수능
      'MOGOSA',      -- 교육청/모의고사
      'EBS',         -- 수특/수완 등
      'TOEFL',
      'TOEIC',
      'TEPS',
      'SAT',
      'CUSTOM'       -- 기타 (직접 만든 세트 등)
    );
  end if;
end$$;

-- ✅ 학생별 암기 상태
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
