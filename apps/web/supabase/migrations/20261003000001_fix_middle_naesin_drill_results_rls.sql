-- middle_naesin_drill_results: 무제한("open", USING true) 정책을 소유권 모델로 교체.
--
-- 코드 경로 (lib/middle-naesin/drill-results.ts):
--   - 학생(role=student)만 자기 결과를 select(기존 행 조회) -> insert/update 한다 (student_id = auth.uid()).
--   - 교사/관리자는 MiddleNaesinDrillResultsReport 에서 전체 결과를 조회만 한다.
-- 따라서: 본인 또는 스태프 조회 / 본인 쓰기 / 스태프 삭제.
-- (20260923000001_fix_linter_permissive_rls_and_buckets.sql 이 다루지 않은 테이블)

BEGIN;

DROP POLICY IF EXISTS "open" ON public.middle_naesin_drill_results;

CREATE POLICY "mn_drill_results_read" ON public.middle_naesin_drill_results
  FOR SELECT TO authenticated
  USING (auth.uid() = student_id OR public.is_staff());

CREATE POLICY "mn_drill_results_own_insert" ON public.middle_naesin_drill_results
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "mn_drill_results_own_update" ON public.middle_naesin_drill_results
  FOR UPDATE TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "mn_drill_results_staff_delete" ON public.middle_naesin_drill_results
  FOR DELETE TO authenticated
  USING (public.is_staff());

COMMIT;
