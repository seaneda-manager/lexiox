-- Cycle 2 단계 A: 보호자 연락처 + 발송함(outbox). expand-only: 새 테이블만 추가, 기존 데이터 변경 없음.
-- 설계: docs/CYCLE2_PARENT_COMMUNICATION_DESIGN.md
--
-- 결정(2026-10-04): 학부모 연락은 카톡/문자를 교사가 직접 보낸다(channel='manual').
--   자동 발송 공급사 없음 → 'sms','alimtalk' 은 나중을 위해 허용만 해 둔다. 학부모 이메일은 받지 않는다.
--
-- 2026-10-04 운영 스키마 대조: profiles.id, class_sessions.id = uuid, public.is_staff() 존재, 이름 충돌 0.
-- student_id 는 Cycle 1 과 같은 규칙으로 profiles(id) (= auth user id).

BEGIN;

-- 보호자 연락처: 기존 academy_students.parent_phone 을 1회 이관한 뒤 이쪽이 정본.
CREATE TABLE IF NOT EXISTS public.guardian_contacts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        text,
  relation    text,                                   -- 어머니/아버지/기타 (자유 입력)
  phone       text NOT NULL CHECK (phone ~ '^01[016789][0-9]{7,8}$'),   -- 숫자만 저장 (앱에서 정규화)
  is_primary  boolean NOT NULL DEFAULT false,
  notice_ok   boolean NOT NULL DEFAULT true,          -- 출결·학습 안내 수신(정보성). false 면 안내 초안을 만들지 않는다.
  source      text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','imported')),
  created_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, phone)                          -- 같은 학생에 같은 번호 중복 방지
);
CREATE INDEX IF NOT EXISTS idx_guardian_contacts_student ON public.guardian_contacts (student_id);
-- 학생당 주 연락처는 최대 1개
CREATE UNIQUE INDEX IF NOT EXISTS uq_guardian_primary_per_student
  ON public.guardian_contacts (student_id) WHERE is_primary;

-- 발송함: 모든 학부모 안내의 정본. 초안 -> 교사 승인 -> 발송(수동 채널은 '보냄 표시').
CREATE TABLE IF NOT EXISTS public.notification_outbox (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind           text NOT NULL CHECK (kind IN ('attendance_absent','attendance_late','attendance_excused','custom')),
  student_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  guardian_id    uuid REFERENCES public.guardian_contacts(id) ON DELETE SET NULL,
  to_phone       text,                                -- 발송 시점 번호를 그대로 보존 (연락처가 나중에 바뀌어도 기록 유지)
  channel        text NOT NULL DEFAULT 'manual' CHECK (channel IN ('manual','sms','alimtalk')),
  body           text NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),   -- 렌더링된 최종 문구
  status         text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','sent','failed','cancelled')),
  dedupe_key     text UNIQUE,                         -- 예: attendance_absent:<session_id>:<student_id>
  ref_session_id uuid REFERENCES public.class_sessions(id) ON DELETE SET NULL,
  created_by     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_by    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at    timestamptz,
  sent_at        timestamptz,
  provider_id    text,                                -- 자동 채널 공급사 메시지 ID (수동은 null)
  error          text,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_outbox_student ON public.notification_outbox (student_id);
CREATE INDEX IF NOT EXISTS idx_outbox_status ON public.notification_outbox (status, created_at DESC);

-- RLS: 교사/관리자 전용 (무제한 true 정책 금지). 학부모/학생 직접 접근 없음.
ALTER TABLE public.guardian_contacts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "guardian_contacts_staff_all" ON public.guardian_contacts
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "notification_outbox_staff_all" ON public.notification_outbox
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

COMMIT;
