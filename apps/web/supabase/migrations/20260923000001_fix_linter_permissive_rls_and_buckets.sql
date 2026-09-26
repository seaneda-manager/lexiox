-- Supabase linter WARN 정리 (2026-09-23 결과) — rls_policy_always_true / public_bucket_allows_listing
--
-- 아래 정책들은 인증만 되면(또는 역할 지정조차 없이) USING/WITH CHECK가 true라
-- 실질적으로 RLS를 우회한다. 각 테이블의 실제 소유권 모델에 맞춰 조인다.
--
--  helper (이미 존재, 20260907000001_student_planner.sql):
--    is_staff()                       -- profiles.role in ('admin','teacher')
--    is_own_academy_student(uuid)     -- academy_students 행이 로그인 사용자 것인지
--
-- 코드 조사 결과, 아래 authenticated-client(RLS가 실제 유일한 방어선) 쓰기 경로를 특히 확인했다:
--   - hi_naesin_passage_analysis / lectures / lecture_assignments / lecture_quiz_questions /
--     middle_naesin_units / middle_naesin_contents : 관리자 페이지 액션이지만 코드 내
--     role 체크가 없다 (레이아웃의 페이지 렌더링 가드만 존재). RLS를 staff 전용으로 좁힌다.
--   - student_vocab_assignments / student_vocab_plans : advanceVocabQueueAfterCompletionAction /
--     setStudentVocabSpeedModeAction가 인증 클라이언트로 studentId를 파라미터로 받아
--     그대로 쓴다. is_own_academy_student()로 잠근다.
--   - daily_tasks_auth_insert : 이미 있는 student_own_daily_task(FOR ALL, auth.uid()=student_id)
--     정책 위에 중복으로 걸린 무제한 INSERT 정책이라 오히려 구멍이 된다. 삭제.
--   - reading_attempt_answers / test_sessions / vocab_items / vocab_track_days / lecture_quiz_attempts :
--     앱 코드에서 쓰기 경로를 찾지 못함(죽은 경로로 보임). 그래도 실소유자/스태프로 좁혀 둔다.

BEGIN;

-- ── 1) daily_tasks: 중복 permissive INSERT 정책 제거 ──────────────────────
-- student_own_daily_task(FOR ALL USING auth.uid() = student_id)가 INSERT까지
-- 이미 올바르게 커버한다 (WITH CHECK 미지정 시 USING이 WITH CHECK로도 쓰임).
DROP POLICY IF EXISTS "daily_tasks_auth_insert" ON public.daily_tasks;

-- ── 2) hi_naesin_passage_analysis: 콘텐츠 테이블, 학생 열람 + 스태프만 쓰기 ──
DROP POLICY IF EXISTS "allow all authenticated" ON public.hi_naesin_passage_analysis;
CREATE POLICY "hi_naesin_analysis_read" ON public.hi_naesin_passage_analysis
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "hi_naesin_analysis_staff_write" ON public.hi_naesin_passage_analysis
  FOR INSERT TO authenticated WITH CHECK (public.is_staff());
CREATE POLICY "hi_naesin_analysis_staff_update" ON public.hi_naesin_passage_analysis
  FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "hi_naesin_analysis_staff_delete" ON public.hi_naesin_passage_analysis
  FOR DELETE TO authenticated USING (public.is_staff());

-- ── 3) lectures: 콘텐츠 테이블, 학생 열람 + 스태프만 쓰기 ──────────────────
DROP POLICY IF EXISTS "admin_all_lectures" ON public.lectures;
CREATE POLICY "lectures_read" ON public.lectures
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "lectures_staff_insert" ON public.lectures
  FOR INSERT TO authenticated WITH CHECK (public.is_staff());
CREATE POLICY "lectures_staff_update" ON public.lectures
  FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "lectures_staff_delete" ON public.lectures
  FOR DELETE TO authenticated USING (public.is_staff());

-- ── 4) lecture_quiz_questions: 학생이 퀴즈 풀 때 읽어야 함 + 스태프만 쓰기 ──
DROP POLICY IF EXISTS "admin_all_quiz_questions" ON public.lecture_quiz_questions;
CREATE POLICY "lecture_quiz_questions_read" ON public.lecture_quiz_questions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "lecture_quiz_questions_staff_insert" ON public.lecture_quiz_questions
  FOR INSERT TO authenticated WITH CHECK (public.is_staff());
CREATE POLICY "lecture_quiz_questions_staff_update" ON public.lecture_quiz_questions
  FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "lecture_quiz_questions_staff_delete" ON public.lecture_quiz_questions
  FOR DELETE TO authenticated USING (public.is_staff());

-- ── 5) lecture_assignments: student_id는 auth.users(id) 직참조. 본인 열람 + 스태프 배정 ──
DROP POLICY IF EXISTS "admin_all_lecture_assignments" ON public.lecture_assignments;
CREATE POLICY "lecture_assignments_read" ON public.lecture_assignments
  FOR SELECT TO authenticated USING (auth.uid() = student_id OR public.is_staff());
CREATE POLICY "lecture_assignments_staff_insert" ON public.lecture_assignments
  FOR INSERT TO authenticated WITH CHECK (public.is_staff());
CREATE POLICY "lecture_assignments_staff_update" ON public.lecture_assignments
  FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "lecture_assignments_staff_delete" ON public.lecture_assignments
  FOR DELETE TO authenticated USING (public.is_staff());

-- ── 6) lecture_completions: 학생이 자기 수료를 직접 upsert (student/lectures/[id]/actions.ts) ──
DROP POLICY IF EXISTS "admin_all_lecture_completions" ON public.lecture_completions;
CREATE POLICY "lecture_completions_read" ON public.lecture_completions
  FOR SELECT TO authenticated USING (auth.uid() = student_id OR public.is_staff());
CREATE POLICY "lecture_completions_own_write" ON public.lecture_completions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id OR public.is_staff());
CREATE POLICY "lecture_completions_own_update" ON public.lecture_completions
  FOR UPDATE TO authenticated USING (auth.uid() = student_id OR public.is_staff())
  WITH CHECK (auth.uid() = student_id OR public.is_staff());
CREATE POLICY "lecture_completions_staff_delete" ON public.lecture_completions
  FOR DELETE TO authenticated USING (public.is_staff());

-- ── 7) lecture_quiz_attempts: 코드상 쓰기 경로 없음(죽은 듯) — 본인/스태프로만 잠금 ──
DROP POLICY IF EXISTS "admin_all_lecture_quiz_attempts" ON public.lecture_quiz_attempts;
CREATE POLICY "lecture_quiz_attempts_read" ON public.lecture_quiz_attempts
  FOR SELECT TO authenticated USING (auth.uid() = student_id OR public.is_staff());
CREATE POLICY "lecture_quiz_attempts_own_insert" ON public.lecture_quiz_attempts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id OR public.is_staff());
CREATE POLICY "lecture_quiz_attempts_staff_update" ON public.lecture_quiz_attempts
  FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "lecture_quiz_attempts_staff_delete" ON public.lecture_quiz_attempts
  FOR DELETE TO authenticated USING (public.is_staff());

-- ── 8) middle_naesin_units / 9) middle_naesin_contents: 콘텐츠, 학생 열람 + 스태프 쓰기 ──
DROP POLICY IF EXISTS "open" ON public.middle_naesin_units;
CREATE POLICY "middle_naesin_units_read" ON public.middle_naesin_units
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "middle_naesin_units_staff_insert" ON public.middle_naesin_units
  FOR INSERT TO authenticated WITH CHECK (public.is_staff());
CREATE POLICY "middle_naesin_units_staff_update" ON public.middle_naesin_units
  FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "middle_naesin_units_staff_delete" ON public.middle_naesin_units
  FOR DELETE TO authenticated USING (public.is_staff());

DROP POLICY IF EXISTS "open" ON public.middle_naesin_contents;
CREATE POLICY "middle_naesin_contents_read" ON public.middle_naesin_contents
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "middle_naesin_contents_staff_insert" ON public.middle_naesin_contents
  FOR INSERT TO authenticated WITH CHECK (public.is_staff());
CREATE POLICY "middle_naesin_contents_staff_update" ON public.middle_naesin_contents
  FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "middle_naesin_contents_staff_delete" ON public.middle_naesin_contents
  FOR DELETE TO authenticated USING (public.is_staff());

-- ── 10) middle_naesin_assignments: student_id는 auth.users(id) 직참조 ──────
DROP POLICY IF EXISTS "open" ON public.middle_naesin_assignments;
CREATE POLICY "middle_naesin_assignments_read" ON public.middle_naesin_assignments
  FOR SELECT TO authenticated USING (auth.uid() = student_id OR public.is_staff());
CREATE POLICY "middle_naesin_assignments_staff_insert" ON public.middle_naesin_assignments
  FOR INSERT TO authenticated WITH CHECK (public.is_staff());
CREATE POLICY "middle_naesin_assignments_staff_update" ON public.middle_naesin_assignments
  FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "middle_naesin_assignments_staff_delete" ON public.middle_naesin_assignments
  FOR DELETE TO authenticated USING (public.is_staff());

-- ── 11) reading_attempt_answers: attempt_id를 통해 reading_attempts.user_id로 소유권 확인 ──
DROP POLICY IF EXISTS "reading_attempt_answers_auth_insert" ON public.reading_attempt_answers;
CREATE POLICY "reading_attempt_answers_own_insert" ON public.reading_attempt_answers
  FOR INSERT TO authenticated WITH CHECK (
    public.is_staff() OR EXISTS (
      SELECT 1 FROM public.reading_attempts ra
      WHERE ra.id = attempt_id AND ra.user_id = auth.uid()
    )
  );

-- ── 12) student_vocab_assignments: student_id는 academy_students(id) 참조 ──
DROP POLICY IF EXISTS "student_vocab_assignments_admin_insert" ON public.student_vocab_assignments;
CREATE POLICY "student_vocab_assignments_own_or_staff_insert" ON public.student_vocab_assignments
  FOR INSERT TO authenticated WITH CHECK (
    public.is_staff() OR public.is_own_academy_student(student_id)
  );

-- ── 13) student_vocab_plans: 동일 소유권 모델 ─────────────────────────────
DROP POLICY IF EXISTS "Allow authenticated users to insert vocab plans" ON public.student_vocab_plans;
CREATE POLICY "student_vocab_plans_own_or_staff_insert" ON public.student_vocab_plans
  FOR INSERT TO authenticated WITH CHECK (
    public.is_staff() OR public.is_own_academy_student(student_id)
  );

DROP POLICY IF EXISTS "Allow authenticated users to update vocab plans" ON public.student_vocab_plans;
CREATE POLICY "student_vocab_plans_own_or_staff_update" ON public.student_vocab_plans
  FOR UPDATE TO authenticated
  USING (public.is_staff() OR public.is_own_academy_student(student_id))
  WITH CHECK (public.is_staff() OR public.is_own_academy_student(student_id));

-- ── 14) test_sessions: assignment_id를 통해 test_assignments.student_id로 소유권 확인 ──
-- (test_assignments.student_id references profiles(id), 즉 auth.uid()와 동일값)
DROP POLICY IF EXISTS "test_sessions_auth_insert" ON public.test_sessions;
CREATE POLICY "test_sessions_own_or_staff_insert" ON public.test_sessions
  FOR INSERT TO authenticated WITH CHECK (
    public.is_staff() OR EXISTS (
      SELECT 1 FROM public.test_assignments ta
      WHERE ta.id = assignment_id AND ta.student_id = auth.uid()
    )
  );

-- ── 15) vocab_items: user_id는 auth.users(id) 직참조 ──────────────────────
DROP POLICY IF EXISTS "vocab_items_auth_insert" ON public.vocab_items;
CREATE POLICY "vocab_items_own_insert" ON public.vocab_items
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ── 16) vocab_track_days: 콘텐츠 구조 테이블(소유자 없음) — 스태프만 쓰기 ──
DROP POLICY IF EXISTS "vocab_track_days_auth_write" ON public.vocab_track_days;
DROP POLICY IF EXISTS "vocab_track_days_auth_update" ON public.vocab_track_days;
DROP POLICY IF EXISTS "vocab_track_days_auth_delete" ON public.vocab_track_days;
CREATE POLICY "vocab_track_days_staff_insert" ON public.vocab_track_days
  FOR INSERT TO authenticated WITH CHECK (public.is_staff());
CREATE POLICY "vocab_track_days_staff_update" ON public.vocab_track_days
  FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "vocab_track_days_staff_delete" ON public.vocab_track_days
  FOR DELETE TO authenticated USING (public.is_staff());

-- ── 17) vocab_tracks: 콘텐츠/커리큘럼 테이블(소유자 없음) — 스태프만 쓰기 ──
DROP POLICY IF EXISTS "vocab_tracks_auth_write" ON public.vocab_tracks;
DROP POLICY IF EXISTS "vocab_tracks_auth_update" ON public.vocab_tracks;
DROP POLICY IF EXISTS "vocab_tracks_auth_delete" ON public.vocab_tracks;
CREATE POLICY "vocab_tracks_staff_insert" ON public.vocab_tracks
  FOR INSERT TO authenticated WITH CHECK (public.is_staff());
CREATE POLICY "vocab_tracks_staff_update" ON public.vocab_tracks
  FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "vocab_tracks_staff_delete" ON public.vocab_tracks
  FOR DELETE TO authenticated USING (public.is_staff());

-- ── Part B: public_bucket_allows_listing ──────────────────────────────────
-- profiles/public-assets/speaking-assets는 public=true 버킷이라 객체 URL 접근은
-- RLS와 무관하게 이미 가능하다. SELECT 정책은 storage API의 list()/info 조회만
-- 넓혀줄 뿐인데, 앱 코드 어디서도 이 세 버킷에 .list()를 호출하지 않는다
-- (audio 버킷만 사용, 이 버킷은 건드리지 않음). 정책을 제거해 열람(list) 노출만 막는다.
DROP POLICY IF EXISTS "avatar_read" ON storage.objects;
DROP POLICY IF EXISTS "Public read public-assets" ON storage.objects;
DROP POLICY IF EXISTS "public read speaking assets" ON storage.objects;

COMMIT;
