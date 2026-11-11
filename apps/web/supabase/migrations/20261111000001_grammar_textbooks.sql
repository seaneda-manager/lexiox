-- 교재 단원 → Universal 문법 챕터 매핑 + 학생 플랜의 "현재 교재 진도"
--   학생이 쓰는 교재(학교/학원)의 목차를 등록하고, 각 교재 단원에 대응하는 Universal 챕터(grammar_2026_units)를 연결한다.
--   플랜에 교재와 현재 단원을 지정하면, 그 단원부터 교재 순서대로 매핑된 챕터를 배정한다.
--   교재를 지정하지 않은 플랜은 기존처럼 레벨/order_index 순서로 배정한다.
-- 추가만 한다. 여러 번 실행해도 안전하다. (선행: 20261021000002_student_grammar_plans.sql)

BEGIN;

CREATE TABLE IF NOT EXISTS public.grammar_textbooks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  level      text NOT NULL DEFAULT 'all' CHECK (level IN ('all', 'ms', 'hs', 'toefl')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS public.grammar_textbook_units (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  textbook_id uuid NOT NULL REFERENCES public.grammar_textbooks(id) ON DELETE CASCADE,
  unit_no     int  NOT NULL,
  title       text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (textbook_id, unit_no)
);

-- 교재 단원 1개 → Universal 챕터 N개 (position 은 한 단원 안에서의 순서)
CREATE TABLE IF NOT EXISTS public.grammar_textbook_unit_chapters (
  textbook_unit_id uuid NOT NULL REFERENCES public.grammar_textbook_units(id) ON DELETE CASCADE,
  unit_id          text NOT NULL REFERENCES public.grammar_2026_units(id) ON DELETE CASCADE,
  position         int  NOT NULL DEFAULT 0,
  PRIMARY KEY (textbook_unit_id, unit_id)
);

CREATE INDEX IF NOT EXISTS idx_grammar_textbook_units_book ON public.grammar_textbook_units (textbook_id, unit_no);

ALTER TABLE public.student_grammar_plans
  ADD COLUMN IF NOT EXISTS textbook_id uuid REFERENCES public.grammar_textbooks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS textbook_unit_no int;

ALTER TABLE public.grammar_textbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grammar_textbook_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grammar_textbook_unit_chapters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "grammar_textbooks_staff_all" ON public.grammar_textbooks;
CREATE POLICY "grammar_textbooks_staff_all" ON public.grammar_textbooks
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
DROP POLICY IF EXISTS "grammar_textbook_units_staff_all" ON public.grammar_textbook_units;
CREATE POLICY "grammar_textbook_units_staff_all" ON public.grammar_textbook_units
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
DROP POLICY IF EXISTS "grammar_textbook_unit_chapters_staff_all" ON public.grammar_textbook_unit_chapters;
CREATE POLICY "grammar_textbook_unit_chapters_staff_all" ON public.grammar_textbook_unit_chapters
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

COMMIT;
