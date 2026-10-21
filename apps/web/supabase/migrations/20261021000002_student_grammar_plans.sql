-- LEXiOX-Gram 문법 챕터 학생별 진도 스케줄
--   학생별 페이스 플랜(시작일 · 요일 · 회당 챕터 수 · 레벨 · 시작 챕터) → 날짜별 챕터 배정(student_grammar_assignments)
--   student_homework_plans / student_vocab_plans 와 같은 방식. 완료 여부는 기존 grammar_2026_unit_completions 를 그대로 쓴다.
-- 챕터 내용(설명/드릴)이 아직 없는(draft) 챕터도 일정에는 들어간다 → 내용은 일정에 맞춰 나중에 채운다.
-- 추가만 한다. 여러 번 실행해도 안전하다.

BEGIN;

CREATE TABLE IF NOT EXISTS public.student_grammar_plans (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date        date NOT NULL,
  weekdays          int[] NOT NULL DEFAULT '{1,3}',          -- 0=일 … 6=토
  units_per_session int NOT NULL DEFAULT 1 CHECK (units_per_session >= 1),
  level             text NOT NULL DEFAULT 'all' CHECK (level IN ('all', 'ms', 'hs', 'toefl')),
  start_unit_id     text REFERENCES public.grammar_2026_units(id) ON DELETE SET NULL,
  is_enabled        boolean NOT NULL DEFAULT true,
  is_paused         boolean NOT NULL DEFAULT false,
  paused_reason     text,
  created_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id)
);

CREATE TABLE IF NOT EXISTS public.student_grammar_assignments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id        uuid NOT NULL REFERENCES public.student_grammar_plans(id) ON DELETE CASCADE,
  student_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unit_id        text NOT NULL REFERENCES public.grammar_2026_units(id) ON DELETE CASCADE,
  scheduled_date date NOT NULL,
  seq            int NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, unit_id)
);

CREATE INDEX IF NOT EXISTS idx_student_grammar_assignments_student_date
  ON public.student_grammar_assignments (student_id, scheduled_date);

ALTER TABLE public.student_grammar_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_grammar_assignments ENABLE ROW LEVEL SECURITY;

-- 관리자/선생님 화면은 service role 로 쓰기를 하지만, 직접 조회할 수 있게 staff 정책도 둔다.
-- 학생은 자기 스케줄만 읽는다 (쓰기는 없음).
DROP POLICY IF EXISTS "student_grammar_plans_staff_all" ON public.student_grammar_plans;
CREATE POLICY "student_grammar_plans_staff_all" ON public.student_grammar_plans
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
DROP POLICY IF EXISTS "student_grammar_plans_own_select" ON public.student_grammar_plans;
CREATE POLICY "student_grammar_plans_own_select" ON public.student_grammar_plans
  FOR SELECT TO authenticated USING (student_id = auth.uid());

DROP POLICY IF EXISTS "student_grammar_assignments_staff_all" ON public.student_grammar_assignments;
CREATE POLICY "student_grammar_assignments_staff_all" ON public.student_grammar_assignments
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
DROP POLICY IF EXISTS "student_grammar_assignments_own_select" ON public.student_grammar_assignments;
CREATE POLICY "student_grammar_assignments_own_select" ON public.student_grammar_assignments
  FOR SELECT TO authenticated USING (student_id = auth.uid());

COMMIT;
