-- 문법 엔진(개념 허브) 기준 학생 진도 스케줄
--   학생이 보는 교재(grammar_books)와 "지금 나가는 단원"을 지정하면, 그 단원부터 교재 순서대로
--   단원에 연결된 개념(grammar_unit_concepts → grammar_concepts)을 학생 레벨(1~5)로 날짜에 배정한다.
--   교재를 지정하지 않으면 개념 난이도순(difficulty_rank)으로 배정한다.
-- 선행: 문법 엔진 마이그레이션(supabase/migrations/20261028000001_grammar_engine_core.sql) 적용 + seed.
-- 추가만 한다. 여러 번 실행해도 안전하다.

BEGIN;

CREATE TABLE IF NOT EXISTS public.student_grammar_concept_plans (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id          uuid REFERENCES public.grammar_books(id) ON DELETE SET NULL,
  current_unit_id  uuid REFERENCES public.grammar_book_units(id) ON DELETE SET NULL,  -- 교재에서 지금 나가는 단원
  level            smallint NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 5),
  start_date       date NOT NULL,
  weekdays         int[] NOT NULL DEFAULT '{1,3}',                                    -- 0=일 … 6=토
  units_per_session int NOT NULL DEFAULT 1 CHECK (units_per_session >= 1),            -- 회당 개념 수
  is_enabled       boolean NOT NULL DEFAULT true,
  is_paused        boolean NOT NULL DEFAULT false,
  created_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id)
);

CREATE TABLE IF NOT EXISTS public.student_grammar_concept_assignments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id        uuid NOT NULL REFERENCES public.student_grammar_concept_plans(id) ON DELETE CASCADE,
  student_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  concept_id     uuid NOT NULL REFERENCES public.grammar_concepts(id) ON DELETE CASCADE,
  scheduled_date date NOT NULL,
  seq            int NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, concept_id)
);
CREATE INDEX IF NOT EXISTS idx_sgca_student_date ON public.student_grammar_concept_assignments (student_id, scheduled_date);

-- 학생이 레슨을 끝낸 기록 (개념 × 레벨). 엔진의 grammar_mastery 는 아직 아무 데서도 쓰지 않아 별도로 둔다.
CREATE TABLE IF NOT EXISTS public.student_grammar_concept_done (
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  concept_id uuid NOT NULL REFERENCES public.grammar_concepts(id) ON DELETE CASCADE,
  level      smallint NOT NULL CHECK (level BETWEEN 1 AND 5),
  done_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, concept_id, level)
);

ALTER TABLE public.student_grammar_concept_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_grammar_concept_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_grammar_concept_done ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sgcp_staff_all" ON public.student_grammar_concept_plans;
CREATE POLICY "sgcp_staff_all" ON public.student_grammar_concept_plans
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
DROP POLICY IF EXISTS "sgcp_own_select" ON public.student_grammar_concept_plans;
CREATE POLICY "sgcp_own_select" ON public.student_grammar_concept_plans
  FOR SELECT TO authenticated USING (student_id = auth.uid());

DROP POLICY IF EXISTS "sgca_staff_all" ON public.student_grammar_concept_assignments;
CREATE POLICY "sgca_staff_all" ON public.student_grammar_concept_assignments
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
DROP POLICY IF EXISTS "sgca_own_select" ON public.student_grammar_concept_assignments;
CREATE POLICY "sgca_own_select" ON public.student_grammar_concept_assignments
  FOR SELECT TO authenticated USING (student_id = auth.uid());

DROP POLICY IF EXISTS "sgcd_staff_all" ON public.student_grammar_concept_done;
CREATE POLICY "sgcd_staff_all" ON public.student_grammar_concept_done
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
DROP POLICY IF EXISTS "sgcd_own_select" ON public.student_grammar_concept_done;
CREATE POLICY "sgcd_own_select" ON public.student_grammar_concept_done
  FOR SELECT TO authenticated USING (student_id = auth.uid());
DROP POLICY IF EXISTS "sgcd_own_insert" ON public.student_grammar_concept_done;
CREATE POLICY "sgcd_own_insert" ON public.student_grammar_concept_done
  FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());

-- 앞서 만들었다가 쓰지 않게 된 교재 테이블 정리 (비어 있을 때만 — 데이터가 있으면 건드리지 않는다)
DO $$
BEGIN
  IF to_regclass('public.grammar_textbooks') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.grammar_textbooks)
     AND NOT EXISTS (SELECT 1 FROM public.grammar_textbook_units) THEN
    ALTER TABLE public.student_grammar_plans DROP COLUMN IF EXISTS textbook_id, DROP COLUMN IF EXISTS textbook_unit_no;
    DROP TABLE IF EXISTS public.grammar_textbook_unit_chapters;
    DROP TABLE IF EXISTS public.grammar_textbook_units;
    DROP TABLE IF EXISTS public.grammar_textbooks;
  END IF;
END $$;

COMMIT;
