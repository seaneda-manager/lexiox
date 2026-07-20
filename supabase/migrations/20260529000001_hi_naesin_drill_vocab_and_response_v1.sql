-- supabase/migrations/20260529000001_hi_naesin_drill_vocab_and_response_v1.sql
-- 1. hi_naesin_drills.drill_type CHECK 에 'vocab' 추가
-- 2. hi_naesin_drill_responses 에 score_pct, feedback_text 컬럼 추가

-- ── 1. drill_type 제약 변경 ───────────────────────────────────────────────
-- PostgreSQL은 CHECK constraint를 in-place로 수정할 수 없으므로
-- 기존 constraint를 DROP 후 새로 ADD 한다.

alter table public.hi_naesin_drills
  drop constraint if exists hi_naesin_drills_drill_type_check;

alter table public.hi_naesin_drills
  add constraint hi_naesin_drills_drill_type_check
    check (drill_type in (
      'translation',
      'fill_blank',
      'writing',
      'summary',
      'grammar_choice',
      'vocab'
    ));

-- ── 2. drill_responses 컬럼 추가 (없는 경우에만) ──────────────────────────
alter table public.hi_naesin_drill_responses
  add column if not exists score_pct    numeric(5,1),
  add column if not exists feedback_text text;
