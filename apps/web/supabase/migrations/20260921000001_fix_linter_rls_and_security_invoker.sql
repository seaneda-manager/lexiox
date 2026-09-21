-- Supabase linter 정리 (2026-09-20 결과)
--  1) jr_* 로그 테이블 RLS 미활성 (rls_disabled_in_public / sensitive_columns_exposed)
--  2) student_recent_topics / class_completed_problems SECURITY DEFINER 뷰
--
-- 1) 로그 테이블은 앱에서 전부 getServiceSupabase()(service role)로만 접근한다
--    (app/protected/jr/{reading,grammar}/[sessionId]/actions.ts, page.tsx).
--    service role은 RLS를 우회하므로 정책 없이 RLS만 켜면 anon/authenticated의
--    PostgREST 직접 접근만 차단되고 앱 동작은 그대로다.
--
-- 2) 뷰는 기본적으로 소유자(postgres) 권한으로 실행되어 RLS를 우회한다.
--    20260812000004에서 재생성했지만 security_invoker 옵션이 없어 린터가 계속 잡는다.
--    뷰 정의는 건드리지 않고 옵션만 켠다 (PG15+). 코드에서 이 뷰들을 조회하는 곳 없음.

BEGIN;

-- 1) RLS 활성화 (정책 없음 = anon/authenticated 전면 차단, service role만 접근)
ALTER TABLE IF EXISTS public.jr_reading_vocab_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.jr_reading_grammar_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.jr_reading_translation_logs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.jr_reading_comprehension_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.jr_reading_discussion_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.jr_grammar_lesson_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.jr_grammar_practice_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.jr_listening_notes_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.jr_listening_question_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.jr_listening_shadowing_logs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.jr_listening_checkup_logs      ENABLE ROW LEVEL SECURITY;

-- 2) 뷰를 호출자 권한으로 실행
ALTER VIEW IF EXISTS public.student_recent_topics    SET (security_invoker = true);
ALTER VIEW IF EXISTS public.class_completed_problems SET (security_invoker = true);

COMMIT;
