-- Cycle 2 단계 B: 학부모 읽기 전용 리포트 링크. expand-only: 새 테이블만 추가.
-- 설계: docs/CYCLE2_PARENT_COMMUNICATION_DESIGN.md
--
-- 보안 모델
--  - 학부모는 로그인하지 않는다. 주소에는 예측 불가능한 토큰(256비트)만 들어간다.
--  - DB 에는 토큰이 아니라 SHA-256 해시(64자 hex)만 저장한다. DB 가 유출돼도 링크를 만들 수 없다.
--  - 링크는 만료되고(앱이 기본 14일), 새 링크를 만들면 이전 링크는 폐기된다.
--  - 테이블은 교사/관리자 RLS 전용. 공개 페이지는 서버에서 서비스 키로 해시를 조회한다(클라이언트 직접 접근 없음).
--
-- 2026-10-04 운영 스키마 대조: profiles.id = uuid, 이름 충돌 0.

BEGIN;

CREATE TABLE IF NOT EXISTS public.parent_report_links (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token_hash     text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at     timestamptz NOT NULL,
  revoked_at     timestamptz,
  created_by     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  last_viewed_at timestamptz,
  view_count     integer NOT NULL DEFAULT 0
);

-- 학생당 '폐기되지 않은' 링크는 최대 1개 (새 링크를 만들기 전에 앱이 이전 링크를 폐기한다)
CREATE UNIQUE INDEX IF NOT EXISTS uq_parent_report_one_live_per_student
  ON public.parent_report_links (student_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_parent_report_links_student ON public.parent_report_links (student_id);

ALTER TABLE public.parent_report_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parent_report_links_staff_all" ON public.parent_report_links
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

COMMIT;
