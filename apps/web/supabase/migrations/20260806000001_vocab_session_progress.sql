-- Vocab Session Progress Tracking
-- ================================

CREATE TABLE IF NOT EXISTS vocab_session_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 학생/세션 정보
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_set_id UUID NOT NULL,

  -- 진행 단계
  current_stage VARCHAR(50) NOT NULL DEFAULT 'PRESCREEN',
  current_word_index INT NOT NULL DEFAULT 0,

  -- 각 단계 완료 상태
  prescreen_completed BOOLEAN DEFAULT FALSE,
  spelling_completed BOOLEAN DEFAULT FALSE,
  summary_completed BOOLEAN DEFAULT FALSE,
  learning_intro_completed BOOLEAN DEFAULT FALSE,
  learning_completed BOOLEAN DEFAULT FALSE,
  session_completed BOOLEAN DEFAULT FALSE,

  -- 단계별 결과 저장
  prescreen_result JSONB,  -- { knownWordIds: [], unknownWordIds: [] }
  spelling_result JSONB,   -- { spellingFailedIds: [] }
  learning_data JSONB,     -- { spellingInputs: [], meaningInputs: [] }

  -- 타임스탐프
  started_at TIMESTAMP DEFAULT NOW(),
  last_updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,

  -- 인덱싱
  UNIQUE(student_id, session_set_id)
);

CREATE INDEX idx_vocab_progress_student ON vocab_session_progress(student_id);
CREATE INDEX idx_vocab_progress_set ON vocab_session_progress(session_set_id);
CREATE INDEX idx_vocab_progress_stage ON vocab_session_progress(current_stage);
CREATE INDEX idx_vocab_progress_updated ON vocab_session_progress(last_updated_at DESC);

-- RPC: 세션 진행 상황 조회
CREATE OR REPLACE FUNCTION get_vocab_session_progress(p_student_id UUID, p_set_id UUID)
RETURNS TABLE (
  id UUID,
  current_stage VARCHAR,
  current_word_index INT,
  prescreen_result JSONB,
  spelling_result JSONB,
  learning_data JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    vsp.id,
    vsp.current_stage,
    vsp.current_word_index,
    vsp.prescreen_result,
    vsp.spelling_result,
    vsp.learning_data
  FROM vocab_session_progress vsp
  WHERE vsp.student_id = p_student_id
    AND vsp.session_set_id = p_set_id
    AND NOT vsp.session_completed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: 세션 진행 상황 저장 또는 업데이트
CREATE OR REPLACE FUNCTION upsert_vocab_session_progress(
  p_student_id UUID,
  p_set_id UUID,
  p_current_stage VARCHAR,
  p_current_word_index INT,
  p_prescreen_result JSONB DEFAULT NULL,
  p_spelling_result JSONB DEFAULT NULL,
  p_learning_data JSONB DEFAULT NULL,
  p_session_completed BOOLEAN DEFAULT FALSE
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO vocab_session_progress (
    student_id,
    session_set_id,
    current_stage,
    current_word_index,
    prescreen_result,
    spelling_result,
    learning_data,
    session_completed,
    last_updated_at
  )
  VALUES (
    p_student_id,
    p_set_id,
    p_current_stage,
    p_current_word_index,
    COALESCE(p_prescreen_result, prescreen_result),
    COALESCE(p_spelling_result, spelling_result),
    COALESCE(p_learning_data, learning_data),
    p_session_completed,
    NOW()
  )
  ON CONFLICT (student_id, session_set_id)
  DO UPDATE SET
    current_stage = p_current_stage,
    current_word_index = p_current_word_index,
    prescreen_result = COALESCE(p_prescreen_result, vocab_session_progress.prescreen_result),
    spelling_result = COALESCE(p_spelling_result, vocab_session_progress.spelling_result),
    learning_data = COALESCE(p_learning_data, vocab_session_progress.learning_data),
    session_completed = p_session_completed,
    last_updated_at = NOW(),
    completed_at = CASE WHEN p_session_completed THEN NOW() ELSE completed_at END
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
