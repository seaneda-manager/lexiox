-- 2단계 2-A: 가맹점(지점) 구조의 기초 — expand-only (컬럼/테이블 추가만, 기존 데이터 삭제·변경 없음)
-- 설계: docs/FRANCHISE_ROLES_DESIGN.md
--
-- 핵심 결정 (2026-11-05): 가맹점 = 기존 `organizations` 테이블.
--   이미 있는 것: organizations(id, name, plan, created_at) — 학원 1개("Main Academy"),
--                 academy_classes.org_id, session_flow_steps.org_id  (반·수업 진행 단계가 이미 org 를 쓴다)
--   새로 만들지 않는 것: branches 테이블 (개념이 둘로 갈라지는 것을 피한다)
--
-- 이 마이그레이션이 하는 일
--   (a) organizations 를 가맹점으로 쓸 수 있게 컬럼 추가: code, kind, status, owner_id, contract_start, phone, address
--   (b) 소속 컬럼 추가: profiles.org_id, profiles.position_id, academy_students.org_id (academy_classes.org_id 는 이미 있음)
--   (c) 선생님 직급·권한 테이블 org_positions (원장이 정한다)
--   (d) 계정·권한 변경 기록 account_audit_log
--   (e) 기존 데이터를 모두 "본점"(기존 Main Academy)으로 채움 — 화면·동작 변화 없음
--
-- 안전장치
--   - 모든 새 컬럼은 NULL 허용(또는 기본값) → 앱 코드가 아직 쓰지 않으므로 동작이 달라지지 않는다.
--   - 여러 번 실행해도 안전(IF NOT EXISTS / ON CONFLICT DO NOTHING / WHERE ... IS NULL).
--   - 되돌리기와 검증 SQL 은 이 파일 맨 아래 주석에 있다.
--   - 선생님 직급 시드의 권한 키는 lib/auth/permissions.ts 의 키와 일치해야 한다
--     (lib/auth/migration2a.test.ts 가 자동 검사한다).

BEGIN;

-- (a) organizations → 가맹점
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS code           text,
  ADD COLUMN IF NOT EXISTS kind           text NOT NULL DEFAULT 'franchise',
  ADD COLUMN IF NOT EXISTS status         text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS owner_id       uuid,
  ADD COLUMN IF NOT EXISTS contract_start date,
  ADD COLUMN IF NOT EXISTS phone          text,
  ADD COLUMN IF NOT EXISTS address        text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organizations_kind_check') THEN
    ALTER TABLE public.organizations
      ADD CONSTRAINT organizations_kind_check CHECK (kind IN ('direct', 'franchise'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organizations_status_check') THEN
    ALTER TABLE public.organizations
      ADD CONSTRAINT organizations_status_check CHECK (status IN ('active', 'paused', 'closed'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organizations_owner_fk') THEN
    ALTER TABLE public.organizations
      ADD CONSTRAINT organizations_owner_fk FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_organizations_code ON public.organizations (code) WHERE code IS NOT NULL;

-- (b) 소속 컬럼
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS org_id      uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS position_id uuid;                      -- FK 는 org_positions 생성 후 아래에서 추가

ALTER TABLE public.academy_students
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_org          ON public.profiles (org_id);
CREATE INDEX IF NOT EXISTS idx_academy_students_org  ON public.academy_students (org_id);
CREATE INDEX IF NOT EXISTS idx_academy_classes_org   ON public.academy_classes (org_id);

-- (c) 선생님 직급·권한 (원장이 정한다). permissions 는 lib/auth/permissions.ts 의 권한 키 배열.
CREATE TABLE IF NOT EXISTS public.org_positions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name        text NOT NULL,
  permissions text[] NOT NULL DEFAULT '{}',
  sort_order  integer NOT NULL DEFAULT 0,
  is_default  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, name)
);
CREATE INDEX IF NOT EXISTS idx_org_positions_org ON public.org_positions (org_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_position_fk') THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_position_fk FOREIGN KEY (position_id) REFERENCES public.org_positions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- (d) 계정·권한 변경 기록 (누가 누구에게 무엇을)
CREATE TABLE IF NOT EXISTS public.account_audit_log (
  id         bigserial PRIMARY KEY,
  actor_id   uuid,
  target_id  uuid,
  org_id     uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  action     text NOT NULL,           -- account_create | role_change | position_change | position_edit | deactivate | org_create ...
  detail     jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_account_audit_org ON public.account_audit_log (org_id, created_at DESC);

-- 서버(service role)만 읽고 쓴다. 앱이 이 테이블에 직접 접근하게 되면 그때 정책을 추가한다.
ALTER TABLE public.org_positions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_audit_log ENABLE ROW LEVEL SECURITY;

-- (e) 기존 데이터 → "본점"(기존 Main Academy) 로 채움
UPDATE public.organizations
   SET kind = 'direct',
       code = 'HQ-001'
 WHERE id = '00000000-0000-0000-0000-000000000001'
   AND code IS NULL;

-- 학생·선생님·원장의 소속. (admin = Super, hq_staff = 본사 직원은 특정 가맹점에 속하지 않으므로 NULL 유지)
UPDATE public.profiles
   SET org_id = '00000000-0000-0000-0000-000000000001'
 WHERE org_id IS NULL
   AND role IN ('student', 'teacher', 'franchisee');

UPDATE public.academy_students
   SET org_id = '00000000-0000-0000-0000-000000000001'
 WHERE org_id IS NULL;

UPDATE public.academy_classes
   SET org_id = '00000000-0000-0000-0000-000000000001'
 WHERE org_id IS NULL;

-- 기본 직급 3개 (원장이 수정·삭제·추가 가능). 권한 키는 lib/auth/permissions.ts 와 일치해야 한다.
INSERT INTO public.org_positions (org_id, name, permissions, sort_order, is_default)
VALUES
  ('00000000-0000-0000-0000-000000000001', '부원장', ARRAY[
      'today.sessions','attendance.check','homework.grade','students.view','assign.manage',
      'exam.create','reports.view','lesson_log.write','students.manage','guardians.view'
   ], 1, true),
  ('00000000-0000-0000-0000-000000000001', '정교사', ARRAY[
      'today.sessions','attendance.check','homework.grade','students.view','assign.manage',
      'exam.create','reports.view','lesson_log.write'
   ], 2, true),
  ('00000000-0000-0000-0000-000000000001', '조교', ARRAY[
      'today.sessions','attendance.check'
   ], 3, true)
ON CONFLICT (org_id, name) DO NOTHING;

COMMIT;

-- ════════════════════════════════════════════════════════════════════
-- 검증 (적용 후 SQL 편집기에서 실행해 결과를 확인한다)
-- ════════════════════════════════════════════════════════════════════
-- 1) 본점 한 줄이 가맹점으로 설정됐는지:
--    SELECT id, name, code, kind, status FROM public.organizations;
--      → Main Academy | HQ-001 | direct | active
-- 2) 소속이 빠짐없이 채워졌는지 (모두 0 이어야 함):
--    SELECT
--      (SELECT count(*) FROM public.academy_students WHERE org_id IS NULL)                         AS students_without_org,
--      (SELECT count(*) FROM public.profiles WHERE org_id IS NULL AND role IN ('student','teacher','franchisee')) AS profiles_without_org,
--      (SELECT count(*) FROM public.academy_classes  WHERE org_id IS NULL)                         AS classes_without_org;
-- 3) 기본 직급 3개:
--    SELECT name, array_length(permissions,1) AS n_perms, is_default FROM public.org_positions ORDER BY sort_order;
--      → 부원장 10 / 정교사 8 / 조교 2
-- 4) 기존 화면이 그대로인지: 사이트에서 /student/home, /teacher/home, /admin/franchise 가 평소처럼 열리는지 확인.
--
-- ════════════════════════════════════════════════════════════════════
-- 되돌리기 (문제가 생겼을 때만. 새로 추가한 것만 지운다 — 기존 데이터는 건드리지 않는다)
-- ════════════════════════════════════════════════════════════════════
-- BEGIN;
-- ALTER TABLE public.profiles          DROP CONSTRAINT IF EXISTS profiles_position_fk;
-- ALTER TABLE public.profiles          DROP COLUMN IF EXISTS position_id, DROP COLUMN IF EXISTS org_id;
-- ALTER TABLE public.academy_students  DROP COLUMN IF EXISTS org_id;
-- DROP TABLE IF EXISTS public.account_audit_log;
-- DROP TABLE IF EXISTS public.org_positions;
-- ALTER TABLE public.organizations
--   DROP CONSTRAINT IF EXISTS organizations_owner_fk,
--   DROP CONSTRAINT IF EXISTS organizations_status_check,
--   DROP CONSTRAINT IF EXISTS organizations_kind_check;
-- DROP INDEX IF EXISTS public.uq_organizations_code;
-- ALTER TABLE public.organizations
--   DROP COLUMN IF EXISTS address, DROP COLUMN IF EXISTS phone, DROP COLUMN IF EXISTS contract_start,
--   DROP COLUMN IF EXISTS owner_id, DROP COLUMN IF EXISTS status, DROP COLUMN IF EXISTS kind, DROP COLUMN IF EXISTS code;
-- COMMIT;
-- (academy_classes.org_id 는 이미 있던 컬럼이므로 되돌리기에서 지우지 않는다. 채워 넣은 값만 NULL 로 되돌리려면
--  UPDATE public.academy_classes SET org_id = NULL WHERE org_id = '00000000-0000-0000-0000-000000000001'; — 단, 이 값이
--  이 마이그레이션 이전에 이미 채워져 있었다면 되돌리지 말 것.)
