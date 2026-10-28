-- JR 콘텐츠 테이블 RLS 정책 추가
--
-- 증상: 관리자가 JR 읽기 지문을 저장하면
--   "new row violates row-level security policy for table jr_reading_passages"
--
-- 원인: 20260812000002_enable_rls_remaining_tables.sql 이 아래 테이블들에 RLS를 켰지만,
--   저장소 어디에도 이 테이블들의 정책(policy)이 없다. 정책이 없는 RLS 테이블은 로그인 세션
--   (authenticated 클라이언트)의 모든 읽기/쓰기를 막는다. 관리자 저장 액션이 인증 클라이언트로
--   쓰기 때문에 INSERT/UPDATE 가 거부된다.
--
-- 조치: 최근 정리(20260923000001)와 같은 모델로 맞춘다.
--   - 읽기: 로그인한 사용자 (학생이 콘텐츠를 열람)
--   - 쓰기(INSERT/UPDATE/DELETE): is_staff() = profiles.role in ('admin','teacher')
--   is_staff() 는 20260907000001_student_planner.sql 에 이미 정의돼 있다.
--
-- 여러 번 실행해도 안전하다(DROP POLICY IF EXISTS 후 CREATE).

BEGIN;

-- jr_reading_passages -----------------------------------------------------
DROP POLICY IF EXISTS "jr_reading_passages_read" ON public.jr_reading_passages;
DROP POLICY IF EXISTS "jr_reading_passages_staff_insert" ON public.jr_reading_passages;
DROP POLICY IF EXISTS "jr_reading_passages_staff_update" ON public.jr_reading_passages;
DROP POLICY IF EXISTS "jr_reading_passages_staff_delete" ON public.jr_reading_passages;
CREATE POLICY "jr_reading_passages_read" ON public.jr_reading_passages
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "jr_reading_passages_staff_insert" ON public.jr_reading_passages
  FOR INSERT TO authenticated WITH CHECK (public.is_staff());
CREATE POLICY "jr_reading_passages_staff_update" ON public.jr_reading_passages
  FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "jr_reading_passages_staff_delete" ON public.jr_reading_passages
  FOR DELETE TO authenticated USING (public.is_staff());

-- jr_grammar_chapters -----------------------------------------------------
DROP POLICY IF EXISTS "jr_grammar_chapters_read" ON public.jr_grammar_chapters;
DROP POLICY IF EXISTS "jr_grammar_chapters_staff_insert" ON public.jr_grammar_chapters;
DROP POLICY IF EXISTS "jr_grammar_chapters_staff_update" ON public.jr_grammar_chapters;
DROP POLICY IF EXISTS "jr_grammar_chapters_staff_delete" ON public.jr_grammar_chapters;
CREATE POLICY "jr_grammar_chapters_read" ON public.jr_grammar_chapters
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "jr_grammar_chapters_staff_insert" ON public.jr_grammar_chapters
  FOR INSERT TO authenticated WITH CHECK (public.is_staff());
CREATE POLICY "jr_grammar_chapters_staff_update" ON public.jr_grammar_chapters
  FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "jr_grammar_chapters_staff_delete" ON public.jr_grammar_chapters
  FOR DELETE TO authenticated USING (public.is_staff());

-- jr_speaking_writing_tasks -----------------------------------------------
DROP POLICY IF EXISTS "jr_speaking_writing_tasks_read" ON public.jr_speaking_writing_tasks;
DROP POLICY IF EXISTS "jr_speaking_writing_tasks_staff_insert" ON public.jr_speaking_writing_tasks;
DROP POLICY IF EXISTS "jr_speaking_writing_tasks_staff_update" ON public.jr_speaking_writing_tasks;
DROP POLICY IF EXISTS "jr_speaking_writing_tasks_staff_delete" ON public.jr_speaking_writing_tasks;
CREATE POLICY "jr_speaking_writing_tasks_read" ON public.jr_speaking_writing_tasks
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "jr_speaking_writing_tasks_staff_insert" ON public.jr_speaking_writing_tasks
  FOR INSERT TO authenticated WITH CHECK (public.is_staff());
CREATE POLICY "jr_speaking_writing_tasks_staff_update" ON public.jr_speaking_writing_tasks
  FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "jr_speaking_writing_tasks_staff_delete" ON public.jr_speaking_writing_tasks
  FOR DELETE TO authenticated USING (public.is_staff());

COMMIT;
