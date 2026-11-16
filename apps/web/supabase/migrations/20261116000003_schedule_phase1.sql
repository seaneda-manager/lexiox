-- 스케줄 시스템 1단계 — docs/SCHEDULE_SYSTEM_AUDIT.md 의 확정 정책 반영 (2026-11-16 승인)
-- 추가만 하고, 여러 번 실행해도 안전하다.
--
-- 정책: 재개=밀어서 이어가기 / 같은 학년=학교+학년 / 준비기간엔 기본 전부 보류, 예외는 "영역별" /
--       시험범위 입력은 선생님(super=admin 은 전권)

BEGIN;

-- 1) 문법 플랜 종류: 정규 / 내신. 학생당 종류별 1개. (지금은 학생당 1개라 둘을 못 나눈다)
ALTER TABLE public.student_grammar_concept_plans
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'regular' CHECK (kind IN ('regular', 'naesin')),
  ADD COLUMN IF NOT EXISTS paused_reason text,                                   -- hold 로 멈춘 것만 되돌리려고 (단어·숙제 플랜과 같은 방식)
  ADD COLUMN IF NOT EXISTS exam_period_id uuid REFERENCES public.school_exam_periods(id) ON DELETE SET NULL;  -- 내신 플랜이 속한 시험기간

ALTER TABLE public.student_grammar_concept_plans DROP CONSTRAINT IF EXISTS student_grammar_concept_plans_student_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_sgcp_student_kind ON public.student_grammar_concept_plans (student_id, kind);

-- 2) 시험 범위: 학교 + 학년 + 시험기간 단위의 개념 목록 (선생님 입력, 같은 학교·학년 학생은 전부 이 목록을 받는다)
CREATE TABLE IF NOT EXISTS public.exam_period_concepts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_period_id   uuid NOT NULL REFERENCES public.school_exam_periods(id) ON DELETE CASCADE,
  grade            text NOT NULL,                                             -- 정규화된 학년 값 (표기 통일 방식은 별도 결정)
  concept_id       uuid NOT NULL REFERENCES public.grammar_concepts(id) ON DELETE CASCADE,
  level            smallint NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 5),
  sort_order       int NOT NULL DEFAULT 0,
  created_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (exam_period_id, grade, concept_id)
);

-- 3) 영역별 예외: 기본은 전부 보류. 행이 있고 hold=false 인 영역만 시험기간에도 계속한다.
CREATE TABLE IF NOT EXISTS public.exam_period_domain_rules (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_period_id   uuid NOT NULL REFERENCES public.school_exam_periods(id) ON DELETE CASCADE,
  domain           text NOT NULL CHECK (domain IN ('vocab', 'homework', 'grammar_regular')),
  hold             boolean NOT NULL DEFAULT true,
  note             text,
  updated_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (exam_period_id, domain)
);

-- 4) RLS: 선생님·admin 만 읽고 쓴다. (admin = super 는 전권이라 별도 정책 불필요)
ALTER TABLE public.exam_period_concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_period_domain_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exam_period_concepts_staff_all" ON public.exam_period_concepts;
CREATE POLICY "exam_period_concepts_staff_all" ON public.exam_period_concepts FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'teacher')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'teacher')));

DROP POLICY IF EXISTS "exam_period_domain_rules_staff_all" ON public.exam_period_domain_rules;
CREATE POLICY "exam_period_domain_rules_staff_all" ON public.exam_period_domain_rules FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'teacher')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'teacher')));

COMMIT;

-- 이 마이그레이션이 하지 않는 것 (데이터 작업이라 SQL 로 일괄 처리하지 않는다):
--   · schools 채우기, academy_students.school_id 연결, 학년 표기 통일  → 사람이 확인하며 화면에서
--   · school_exam_periods 입력                                           → 선생님이 화면에서
