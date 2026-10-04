-- Cycle 1 (반 + 출석 + 수업 진행 보드) 핵심 테이블. expand-only: 컬럼/테이블 추가만, 기존 데이터 변경 없음.
-- 설계: docs/CYCLE1_CLASSES_ATTENDANCE_DESIGN.md
-- 출석은 교사가 직접 체크한다(자동 출석은 하지 않기로 결정, 2026-10-03). 나중에 자동 판정이
-- 필요해지면 컬럼/테이블만 추가하면 되도록 expand-only 로 설계했다.
--
-- 2026-10-03 운영 스키마 대조 결과:
--   profiles.id / organizations.id / academy_classes.id / academy_class_meetings.id = uuid
--   academy_class_students.student_id -> profiles(id)  => 새 테이블의 student_id 도 profiles(id) 로 통일
--   아래 새 테이블/컬럼 이름은 운영에 아직 없음(충돌 0)

BEGIN;

-- (a) 반 확장: 담당 교사, 활성 여부, 진행 흐름 키(학원별 커스터마이즈)
ALTER TABLE public.academy_classes
  ADD COLUMN IF NOT EXISTS teacher_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_active  boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS flow_key   text;

-- (b) 반 소속 확장: 입/퇴반 날짜 (반을 옮겨도 과거 출석 맥락 보존)
ALTER TABLE public.academy_class_students
  ADD COLUMN IF NOT EXISTS joined_on date NOT NULL DEFAULT current_date,
  ADD COLUMN IF NOT EXISTS left_on   date;

-- (c) 실제 수업 회차 (템플릿 academy_class_meetings 와 분리)
CREATE TABLE IF NOT EXISTS public.class_sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id      uuid NOT NULL REFERENCES public.academy_classes(id) ON DELETE CASCADE,
  session_date  date NOT NULL,
  start_time    time NOT NULL,
  duration_min  integer NOT NULL DEFAULT 90 CHECK (duration_min > 0),
  kind          text NOT NULL DEFAULT 'regular' CHECK (kind IN ('regular','makeup','extra')),
  status        text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','held','cancelled')),
  cancel_reason text,
  meeting_id    uuid REFERENCES public.academy_class_meetings(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, session_date, start_time)
);
CREATE INDEX IF NOT EXISTS idx_class_sessions_date ON public.class_sessions (session_date);

-- (d) 출석 기록: 교사가 직접 체크 (기본 전원 출석, 예외만 수정). 지각 기준 5분은 교사가 판단.
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    uuid NOT NULL REFERENCES public.class_sessions(id) ON DELETE CASCADE,
  student_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status        text NOT NULL CHECK (status IN ('present','late','absent','excused')),
  note          text,
  marked_by     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  marked_at     timestamptz NOT NULL DEFAULT now(),
  notified_at   timestamptz,                -- Cycle 2 알림 발송 시각 (이번엔 비움)
  UNIQUE (session_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON public.attendance_records (student_id);

-- (e) 진행 단계 정의: 학원별 커스터마이즈 (org_id NULL = 전체 기본값)
CREATE TABLE IF NOT EXISTS public.session_flow_steps (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id    uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  flow_key  text NOT NULL DEFAULT 'default',
  step_key  text NOT NULL,
  label     text NOT NULL,
  position  integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- org_id NULL 도 중복 방지되도록 COALESCE 로 유니크 보장
CREATE UNIQUE INDEX IF NOT EXISTS uq_session_flow_steps
  ON public.session_flow_steps (COALESCE(org_id, '00000000-0000-0000-0000-000000000000'::uuid), flow_key, step_key);

-- (f) 학생별 진행 기록: 수업 안에서 이 학생이 어느 단계까지 했나
CREATE TABLE IF NOT EXISTS public.session_student_steps (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid NOT NULL REFERENCES public.class_sessions(id) ON DELETE CASCADE,
  student_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  step_key    text NOT NULL,
  done_at     timestamptz,
  done_by     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  note        text,
  UNIQUE (session_id, student_id, step_key)
);
CREATE INDEX IF NOT EXISTS idx_session_student_steps_student ON public.session_student_steps (student_id);

-- ── RLS: 교사/관리자 전용 (무제한 true 정책 금지). 학생·학부모 열람은 Cycle 2 에서 서버 API 로. ──
ALTER TABLE public.class_sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_flow_steps    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_student_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "class_sessions_staff_all" ON public.class_sessions
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "attendance_records_staff_all" ON public.attendance_records
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "session_flow_steps_staff_all" ON public.session_flow_steps
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "session_student_steps_staff_all" ON public.session_student_steps
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

-- ── 기본 진행 흐름 시드 (학원 설정 화면에서 바꿀 수 있음) ──
INSERT INTO public.session_flow_steps (org_id, flow_key, step_key, label, position)
SELECT NULL, 'default', v.step_key, v.label, v.position
FROM (VALUES
  ('homework_check', '숙제 검사',     1),
  ('wrong_review',   '오답 체크·수정', 2),
  ('havruta_prep',   '하브루타 준비',  3),
  ('havruta_1on1',   '하브루타 1:1',  4)
) AS v(step_key, label, position)
WHERE NOT EXISTS (
  SELECT 1 FROM public.session_flow_steps s
  WHERE s.org_id IS NULL AND s.flow_key = 'default' AND s.step_key = v.step_key
);

COMMIT;
