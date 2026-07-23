-- Learning Stage 테이블: 단어별 학습 단계별 데이터
CREATE TABLE IF NOT EXISTS learning_stage_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 기본 정보
  word_id UUID NOT NULL UNIQUE REFERENCES words(id) ON DELETE CASCADE,

  -- Tab 1: Spelling
  given_spelling VARCHAR(100) NOT NULL,

  -- Tab 2: Meaning
  meaning_1 VARCHAR(200),
  meaning_1_en VARCHAR(200),
  meaning_2 VARCHAR(200),
  meaning_2_en VARCHAR(200),
  meaning_context TEXT,
  meaning_related_words JSONB DEFAULT '[]'::jsonb,
  meaning_definition_en TEXT,

  -- Tab 3: Quiz
  quiz_synonyms JSONB DEFAULT '[]'::jsonb,
  quiz_example_en TEXT,
  quiz_example_ko TEXT,
  quiz_choices JSONB,  -- [{"id": 1, "text": "...", "is_correct": true}, ...]

  -- 데이터 품질 상태
  data_status VARCHAR(20) NOT NULL DEFAULT 'clean' CHECK (data_status IN ('clean', 'flagged', 'rejected')),
  mojibake_detected BOOLEAN DEFAULT FALSE,
  admin_notes TEXT,

  -- 시간 추적
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- 인덱스
  INDEX idx_learning_stage_word_id (word_id),
  INDEX idx_learning_stage_status (data_status),
  INDEX idx_learning_stage_mojibake (mojibake_detected)
);

-- Learning Stage 진행 기록: 학생의 각 단계별 시도 기록
CREATE TABLE IF NOT EXISTS learning_stage_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 외래키
  student_id UUID NOT NULL REFERENCES academy_students(id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES words(id) ON DELETE CASCADE,

  -- Tab 1: Spelling 진행
  spelling_attempt VARCHAR(100),
  spelling_correct BOOLEAN,
  spelling_attempts INT DEFAULT 1,

  -- Tab 2: Meaning 진행
  meaning_viewed BOOLEAN DEFAULT FALSE,

  -- Tab 3: Quiz 진행
  quiz_answer INT,  -- 선택한 선택지 ID
  quiz_correct BOOLEAN,
  quiz_attempts INT DEFAULT 1,

  -- 전체 진행 정보
  tab_sequence JSONB,  -- ["spelling", "meaning", "quiz"]
  time_spent_total INT,  -- 총 소요 시간 (초)

  -- 상태
  completed_at TIMESTAMP,

  -- 시간 추적
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- 인덱스
  INDEX idx_learning_stage_attempts_student (student_id),
  INDEX idx_learning_stage_attempts_word (word_id),
  INDEX idx_learning_stage_attempts_completed (completed_at),

  -- 복합 인덱스 (학생 진행률 조회)
  UNIQUE(student_id, word_id)
);

-- Admin 플래그 관리: 정제 규칙 위반 항목
CREATE TABLE IF NOT EXISTS learning_stage_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 대상 단어
  word_id UUID NOT NULL REFERENCES words(id) ON DELETE CASCADE,

  -- 플래그 정보
  flag_type VARCHAR(50) NOT NULL,  -- 'MOJIBAKE_DETECTED', 'EMPTY_MEANING', 'BAD_PAIR', 'LENGTH_MISMATCH', 'BAD_TRANSLATION'
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('HIGH', 'MEDIUM', 'LOW')),

  -- 원본 & 제안
  original_data JSONB,  -- 원본 데이터
  detected_issue TEXT,  -- 감지된 문제
  suggested_fix TEXT,  -- 제안된 수정사항
  confidence DECIMAL(3, 2),  -- AI 신뢰도 (0.00 ~ 1.00)

  -- 해결 상태
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'edited')),
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP,
  admin_notes TEXT,

  -- 시간 추적
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- 인덱스
  INDEX idx_learning_stage_flags_word (word_id),
  INDEX idx_learning_stage_flags_status (status),
  INDEX idx_learning_stage_flags_severity (severity),
  INDEX idx_learning_stage_flags_type (flag_type)
);

-- 확장: words 테이블에 Learning Stage 관련 필드 추가
ALTER TABLE words ADD COLUMN IF NOT EXISTS learning_stage_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE words ADD COLUMN IF NOT EXISTS learning_stage_attempts INT DEFAULT 0;
ALTER TABLE words ADD COLUMN IF NOT EXISTS last_learning_stage_attempt TIMESTAMP;

-- 확장: academy_students 테이블에 streak 관련 필드 추가
ALTER TABLE academy_students ADD COLUMN IF NOT EXISTS learning_stage_streak INT DEFAULT 0;
ALTER TABLE academy_students ADD COLUMN IF NOT EXISTS last_learning_stage_date DATE;
ALTER TABLE academy_students ADD COLUMN IF NOT EXISTS learning_stage_total_points INT DEFAULT 0;
