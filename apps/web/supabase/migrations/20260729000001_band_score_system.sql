-- 2026-07-29: TOEFL 2026 1.0~6.0 Band Score 시스템 추가

-- 1. reading_results_2026 테이블 업데이트
-- 기존 0~30점 필드 제거, Band Score 필드 추가
ALTER TABLE reading_results_2026
DROP COLUMN IF EXISTS raw_score,
DROP COLUMN IF EXISTS scaled_score,
DROP COLUMN IF EXISTS percentage;

ALTER TABLE reading_results_2026
ADD COLUMN IF NOT EXISTS m1_raw_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS m2_raw_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS m1_accuracy NUMERIC(5, 2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS difficulty_path TEXT CHECK (difficulty_path IN ('HARD', 'EASY', NULL)),
ADD COLUMN IF NOT EXISTS band_score NUMERIC(3, 1) CHECK (band_score >= 1.0 AND band_score <= 6.0),
ADD COLUMN IF NOT EXISTS accuracy_percent INTEGER DEFAULT 0;

-- 2. listening_results_2026 테이블 업데이트 (동일 구조)
ALTER TABLE listening_results_2026
ADD COLUMN IF NOT EXISTS m1_raw_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS m2_raw_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS m1_accuracy NUMERIC(5, 2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS difficulty_path TEXT CHECK (difficulty_path IN ('HARD', 'EASY', NULL)),
ADD COLUMN IF NOT EXISTS band_score NUMERIC(3, 1) CHECK (band_score >= 1.0 AND band_score <= 6.0),
ADD COLUMN IF NOT EXISTS accuracy_percent INTEGER DEFAULT 0;

-- 3. speaking_results_2026 테이블 업데이트 (Fixed 타입)
ALTER TABLE speaking_results_2026
ADD COLUMN IF NOT EXISTS avg_rubric_score NUMERIC(3, 1),
ADD COLUMN IF NOT EXISTS band_score NUMERIC(3, 1) CHECK (band_score >= 1.0 AND band_score <= 6.0);

-- 4. writing_2026_answers 테이블 업데이트 (Fixed 타입)
ALTER TABLE writing_2026_answers
ADD COLUMN IF NOT EXISTS rubric_score NUMERIC(3, 1),
ADD COLUMN IF NOT EXISTS band_score NUMERIC(3, 1) CHECK (band_score >= 1.0 AND band_score <= 6.0);

-- 5. toefl_test_results 테이블 생성 (최종 Overall Band Score)
CREATE TABLE IF NOT EXISTS toefl_test_results (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  test_session_id TEXT NOT NULL,

  -- 각 섹션 Band Score
  reading_band NUMERIC(3, 1) NOT NULL,
  listening_band NUMERIC(3, 1) NOT NULL,
  speaking_band NUMERIC(3, 1) NOT NULL,
  writing_band NUMERIC(3, 1) NOT NULL,

  -- Overall Score
  overall_band NUMERIC(3, 1) NOT NULL,

  -- Metadata
  test_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT band_score_range CHECK (
    overall_band >= 1.0 AND overall_band <= 6.0
  ),
  UNIQUE(user_id, test_session_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS toefl_test_results_user_id_idx
ON toefl_test_results(user_id);

CREATE INDEX IF NOT EXISTS toefl_test_results_completed_at_idx
ON toefl_test_results(completed_at);

-- 6. 기본 값 제약 조건 추가
ALTER TABLE reading_results_2026
ADD CONSTRAINT reading_band_score_check
CHECK (band_score IS NULL OR (band_score >= 1.0 AND band_score <= 6.0));

ALTER TABLE listening_results_2026
ADD CONSTRAINT listening_band_score_check
CHECK (band_score IS NULL OR (band_score >= 1.0 AND band_score <= 6.0));

-- 7. 마이그레이션 기록 테이블
CREATE TABLE IF NOT EXISTS migration_logs (
  id BIGSERIAL PRIMARY KEY,
  migration_name TEXT NOT NULL UNIQUE,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO migration_logs (migration_name)
VALUES ('20260729000001_band_score_system')
ON CONFLICT DO NOTHING;
