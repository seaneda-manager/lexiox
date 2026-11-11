-- Hi-내신: 지문 핵심 어휘 자동 취합 + 학생 단어장(하이라이트로 모은 단어)
-- 수동 적용: Supabase SQL Editor 에서 실행. 재실행해도 안전(idempotent).

-- 1) 지문별 핵심 어휘 캐시 (AI가 기준에 따라 1회 추출 → 이후 모든 학생이 재사용)
create table if not exists public.hi_naesin_passage_terms (
  passage_id   uuid primary key references public.hi_naesin_passages(id) on delete cascade,
  items        jsonb not null default '[]'::jsonb,   -- [{term, surface, kind, pos, meaningKo, level, reason}]
  model        text,
  generated_at timestamptz not null default now()
);

alter table public.hi_naesin_passage_terms enable row level security;

drop policy if exists "hi_naesin_passage_terms_read" on public.hi_naesin_passage_terms;
create policy "hi_naesin_passage_terms_read"
  on public.hi_naesin_passage_terms for select
  using (auth.uid() is not null);

drop policy if exists "hi_naesin_passage_terms_write" on public.hi_naesin_passage_terms;
create policy "hi_naesin_passage_terms_write"
  on public.hi_naesin_passage_terms for all
  using (public.is_admin_or_producer(auth.uid()))
  with check (public.is_admin_or_producer(auth.uid()));

-- 2) 학생 단어장: 지문에서 하이라이트(선택)하거나 핵심 어휘에서 담은 항목
create table if not exists public.hi_naesin_student_words (
  id               uuid primary key default gen_random_uuid(),
  student_id       uuid not null references auth.users(id) on delete cascade,
  passage_id       uuid references public.hi_naesin_passages(id) on delete set null,
  term             text not null,                       -- 학생이 고른 표면형 (예: "figured out")
  term_key         text not null,                       -- 소문자 정규화 키 (중복 방지)
  lemma            text,                                -- 원형 (예: "figure out")
  kind             text not null default 'word'
                     check (kind in ('word','phrase','phrasal_verb','idiom','term')),
  pos              text,                                -- 품사 (noun, verb, adj ...)
  meaning_ko       text,
  context_sentence text,                                -- 선택한 단어가 들어 있던 문장
  source           text not null default 'highlight'
                     check (source in ('highlight','key_term')),
  mastered         boolean not null default false,
  created_at       timestamptz not null default now(),
  unique (student_id, term_key)
);

create index if not exists idx_hi_naesin_student_words_student
  on public.hi_naesin_student_words (student_id, created_at desc);

alter table public.hi_naesin_student_words enable row level security;

drop policy if exists "hi_naesin_student_words_own" on public.hi_naesin_student_words;
create policy "hi_naesin_student_words_own"
  on public.hi_naesin_student_words for all
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

-- 3) 용어 뜻 캐시 (하이라이트 조회 비용 절감, 모든 학생 공용). 쓰기는 서버(service role)만.
create table if not exists public.hi_naesin_term_glossary (
  term_key   text primary key,
  lemma      text,
  kind       text not null default 'word',
  pos        text,
  meaning_ko text not null,
  created_at timestamptz not null default now()
);

alter table public.hi_naesin_term_glossary enable row level security;

drop policy if exists "hi_naesin_term_glossary_read" on public.hi_naesin_term_glossary;
create policy "hi_naesin_term_glossary_read"
  on public.hi_naesin_term_glossary for select
  using (auth.uid() is not null);

-- ── 확인 쿼리 ─────────────────────────────────────────────
-- select table_name from information_schema.tables
--  where table_schema='public'
--    and table_name in ('hi_naesin_passage_terms','hi_naesin_student_words','hi_naesin_term_glossary');
-- (3행이 나와야 정상)
