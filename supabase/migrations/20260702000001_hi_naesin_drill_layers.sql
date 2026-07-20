-- supabase/migrations/20260702000001_hi_naesin_drill_layers.sql
-- 드릴 레이어 개편: 문장 중요도 태그 + 배열/3지선다 드릴 타입 추가

-- ──────────────────────────────────────────
-- 1. 문장 중요도 (is_key 미사용 컬럼 → importance 3단계로 대체)
-- ──────────────────────────────────────────
alter table public.hi_naesin_passage_sentences
  drop column if exists is_key;

alter table public.hi_naesin_passage_sentences
  add column if not exists importance text not null default 'medium'
    check (importance in ('low', 'medium', 'high'));

-- ──────────────────────────────────────────
-- 2. 드릴 타입 확장
-- drill_type별 payload 구조 (신규):
--   translation_arrange : { sentenceEn, chunks: [{id, ko}] }        -- chunks는 정답 순서
--   writing_arrange     : { koPrompt, chunks: [{id, en}] }          -- chunks는 정답 순서
--   translation_choice  : { sentenceEn, options: [{key,text}], correct, explanation }
-- ──────────────────────────────────────────
alter table public.hi_naesin_drills
  drop constraint if exists hi_naesin_drills_drill_type_check;

alter table public.hi_naesin_drills
  add constraint hi_naesin_drills_drill_type_check
  check (drill_type in (
    'translation',
    'translation_arrange',
    'translation_choice',
    'fill_blank',
    'writing',
    'writing_arrange',
    'summary',
    'grammar_choice',
    'vocab'
  ));
