-- Speaking Test Responses Table
CREATE TABLE IF NOT EXISTS speaking_test_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_id TEXT NOT NULL,

  -- 11개 오디오 URL 저장 (JSON 형식)
  audio_urls JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- 메타데이터
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'submitted', -- submitted, scoring, scored, reviewed

  -- 채점 결과 (나중에 추가)
  scores JSONB, -- { "task1": [...], "task2": [...], "overall": ... }
  feedback TEXT,
  scored_at TIMESTAMP WITH TIME ZONE,

  -- 인덱싱
  UNIQUE(student_id, test_id),
  INDEX idx_student_id (student_id),
  INDEX idx_status (status)
);

-- RLS (Row Level Security) 활성화
ALTER TABLE speaking_test_responses ENABLE ROW LEVEL SECURITY;

-- 학생은 자신의 응답만 볼 수 있음
CREATE POLICY "Students can view own responses"
  ON speaking_test_responses
  FOR SELECT
  USING (auth.uid() = student_id);

-- 학생은 자신의 응답만 생성 가능
CREATE POLICY "Students can insert own responses"
  ON speaking_test_responses
  FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- 관리자는 모든 응답을 볼 수 있음
CREATE POLICY "Admins can view all responses"
  ON speaking_test_responses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
