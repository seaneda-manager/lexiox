-- Supabase linter WARN 정리 — Part B: ⚠️ 코드 배포 후에 적용할 것
--
-- 아래 함수는 호출자 검증 없이(또는 미확인) 로그인 사용자가 RPC로 직접 호출할 수 있었다.
--   admin_set_role                          : 역할 변경 (권한 상승 위험)
--   award_points                            : 임의 학생에게 포인트 적립
--   save_reading_passage_full[_with_order]  : Reading 지문/문항 저장
-- 앱은 이제 admin/teacher 확인 후 service role 클라이언트로만 호출한다:
--   app/protected/admin/set-role/route.ts
--   lib/gamification/awardPoints.ts, app/api/admin/perks/resolve/route.ts
--   app/api/teacher/reading/editor/save/route.ts, app/api/admin/content/import/route.ts
-- 이 코드가 배포되기 전에 적용하면 포인트 적립/지문 저장/역할 변경이 실패한다.

BEGIN;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'admin_set_role',
        'award_points',
        'save_reading_passage_full',
        'save_reading_passage_full_with_order'
      )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;

COMMIT;
