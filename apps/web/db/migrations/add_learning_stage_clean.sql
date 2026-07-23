-- Learning Stage 테이블: 단어별 학습 단계별 데이터
CREATE TABLE IF NOT EXISTS learning_stage_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word_id UUID NOT NULL UNIQUE REFERENCES words(id) ON DELETE CASCADE,
  given_spelling VARCHAR(100) NOT NULL,
  meaning_1 VARCHAR(200),
  meaning_1_en VARCHAR(200),
  meaning_2 VARCHAR(200),
  meaning_2_en VARCHAR(200),
  meaning_context TEXT,
  meaning_related_words JSONB DEFAULT '[]'::jsonb,
  meaning_definition_en TEXT,
  quiz_synonyms JSONB DEFAULT '[]'::jsonb,
  quiz_example_en TEXT,
  quiz_example_ko TEXT,
  quiz_choices JSONB,
  data_status VARCHAR(20) NOT NULL DEFAULT 'clean' CHECK (data_status IN ('clean', 'flagged', 'rejected')),
  mojibake_detected BOOLEAN DEFAULT FALSE,
  admin_notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_learning_stage_word_id ON learning_stage_items(word_id);
CREATE INDEX idx_learning_stage_status ON learning_stage_items(data_status);
CREATE INDEX idx_learning_stage_mojibake ON learning_stage_items(mojibake_detected);

-- Learning Stage 진행 기록
CREATE TABLE IF NOT EXISTS learning_stage_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES academy_students(id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  spelling_attempt VARCHAR(100),
  spelling_correct BOOLEAN,
  spelling_attempts INT DEFAULT 1,
  meaning_viewed BOOLEAN DEFAULT FALSE,
  quiz_answer INT,
  quiz_correct BOOLEAN,
  quiz_attempts INT DEFAULT 1,
  tab_sequence JSONB,
  time_spent_total INT,
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, word_id)
);

CREATE INDEX idx_learning_stage_attempts_student ON learning_stage_attempts(student_id);
CREATE INDEX idx_learning_stage_attempts_word ON learning_stage_attempts(word_id);
CREATE INDEX idx_learning_stage_attempts_completed ON learning_stage_attempts(completed_at);

-- Admin 플래그 관리
CREATE TABLE IF NOT EXISTS learning_stage_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word_id UUID NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  flag_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('HIGH', 'MEDIUM', 'LOW')),
  original_data JSONB,
  detected_issue TEXT,
  suggested_fix TEXT,
  confidence DECIMAL(3, 2),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'edited')),
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP,
  admin_notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_learning_stage_flags_word ON learning_stage_flags(word_id);
CREATE INDEX idx_learning_stage_flags_status ON learning_stage_flags(status);
CREATE INDEX idx_learning_stage_flags_severity ON learning_stage_flags(severity);
CREATE INDEX idx_learning_stage_flags_type ON learning_stage_flags(flag_type);

-- 확장: words 테이블
ALTER TABLE words ADD COLUMN IF NOT EXISTS learning_stage_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE words ADD COLUMN IF NOT EXISTS learning_stage_attempts INT DEFAULT 0;
ALTER TABLE words ADD COLUMN IF NOT EXISTS last_learning_stage_attempt TIMESTAMP;

-- 확장: academy_students 테이블
ALTER TABLE academy_students ADD COLUMN IF NOT EXISTS learning_stage_streak INT DEFAULT 0;
ALTER TABLE academy_students ADD COLUMN IF NOT EXISTS last_learning_stage_date DATE;
ALTER TABLE academy_students ADD COLUMN IF NOT EXISTS learning_stage_total_points INT DEFAULT 0;
