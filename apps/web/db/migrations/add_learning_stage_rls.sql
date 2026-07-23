-- Learning Stage RLS (Row Level Security) 정책
-- 마이그레이션 실행 후 바로 실행할 것

-- ============================================
-- 1. learning_stage_items RLS
-- ============================================
-- 학생은 모든 단어를 읽을 수 있지만 수정 불가

ALTER TABLE learning_stage_items ENABLE ROW LEVEL SECURITY;

-- 모든 인증된 사용자가 읽을 수 있음
CREATE POLICY "learning_stage_items_read_all"
  ON learning_stage_items FOR SELECT
  USING (true);

-- Admin만 쓰기/수정 가능
CREATE POLICY "learning_stage_items_write_admin"
  ON learning_stage_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "learning_stage_items_update_admin"
  ON learning_stage_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 2. learning_stage_attempts RLS
-- ============================================
-- 학생은 자신의 기록만 보고 쓸 수 있음

ALTER TABLE learning_stage_attempts ENABLE ROW LEVEL SECURITY;

-- 학생이 자신의 기록만 조회
CREATE POLICY "learning_stage_attempts_read_own"
  ON learning_stage_attempts FOR SELECT
  USING (
    student_id = (
      SELECT id FROM academy_students
      WHERE user_id = auth.uid()
    )
  );

-- 학생이 자신의 기록만 쓰기
CREATE POLICY "learning_stage_attempts_insert_own"
  ON learning_stage_attempts FOR INSERT
  WITH CHECK (
    student_id = (
      SELECT id FROM academy_students
      WHERE user_id = auth.uid()
    )
  );

-- 학생이 자신의 기록만 업데이트
CREATE POLICY "learning_stage_attempts_update_own"
  ON learning_stage_attempts FOR UPDATE
  USING (
    student_id = (
      SELECT id FROM academy_students
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    student_id = (
      SELECT id FROM academy_students
      WHERE user_id = auth.uid()
    )
  );

-- Admin은 모든 기록 조회 가능
CREATE POLICY "learning_stage_attempts_read_admin"
  ON learning_stage_attempts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 3. learning_stage_flags RLS
-- ============================================
-- Admin만 접근 가능

ALTER TABLE learning_stage_flags ENABLE ROW LEVEL SECURITY;

-- Admin만 조회
CREATE POLICY "learning_stage_flags_read_admin"
  ON learning_stage_flags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
    )
  );

-- Admin만 쓰기
CREATE POLICY "learning_stage_flags_insert_admin"
  ON learning_stage_flags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
    )
  );

-- Admin만 업데이트
CREATE POLICY "learning_stage_flags_update_admin"
  ON learning_stage_flags FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
    )
  );

-- Admin만 삭제
CREATE POLICY "learning_stage_flags_delete_admin"
  ON learning_stage_flags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 검증: RLS 정책 확인
-- ============================================
SELECT
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN ('learning_stage_items', 'learning_stage_attempts', 'learning_stage_flags')
GROUP BY tablename;
