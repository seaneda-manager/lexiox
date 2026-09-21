-- Supabase linter WARN 정리 (2026-09-20 결과) — Part A: 코드 배포 순서와 무관하게 적용 가능
--
--  1) function_search_path_mutable (6건): search_path 고정
--  2) 트리거 전용 SECURITY DEFINER 함수(handle_new_user, fill_answer_user_id):
--     트리거 실행에는 호출자 EXECUTE 권한이 필요 없으므로 RPC 노출만 제거
--  3) 앱 코드에서 호출하지 않는 SECURITY DEFINER 함수: anon/authenticated 모두 회수
--     (make_admin, make_teacher, consume_listening_play, inc_listening_plays,
--      lock_vocab_drill_asset, record_vocab_drill_attempt_v2)
--  4) 로그인 사용자 세션으로 호출 중인 함수(admin_set_role, award_points,
--     save_reading_passage_full[_with_order]): 여기선 anon만 회수.
--     authenticated 회수는 Part B (코드가 service role로 바뀐 뒤).
--
-- 남기는 것(의도적): is_staff / is_admin_or_producer / is_own_academy_student /
--   is_current_user_student_key / student_can_view_exam — RLS 정책이 호출자 권한으로
--   실행하는 헬퍼라 authenticated EXECUTE 필요. 호출자 본인 기준 boolean만 반환.
--
-- 함수 오버로드/시그니처 차이를 피하려고 이름 기준으로 pg_proc을 순회한다.
-- 존재하지 않는 함수는 조용히 건너뛴다.

BEGIN;

-- 1) search_path 고정
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'calc_level',
        'update_reading_q_exp_updated_at',
        'create_overdue_assignment_notices',
        'calculate_available_date',
        'get_course_available_dates',
        'shift_assignments_by_event'
      )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', r.sig);
  END LOOP;
END $$;

-- 2, 3) RPC 노출 완전 제거 (PUBLIC/anon/authenticated)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'handle_new_user',
        'fill_answer_user_id',
        'make_admin',
        'make_teacher',
        'consume_listening_play',
        'inc_listening_plays',
        'lock_vocab_drill_asset',
        'record_vocab_drill_attempt_v2'
      )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;

-- 4) anon만 회수 (PUBLIC 경유 권한이 있을 수 있으므로 authenticated는 명시 부여)
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
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', r.sig);
  END LOOP;
END $$;

COMMIT;
