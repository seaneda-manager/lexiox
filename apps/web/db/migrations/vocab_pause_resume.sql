-- Vocab Assignment에 pause/resume 컬럼 추가
ALTER TABLE student_vocab_assignments ADD COLUMN IF NOT EXISTS
  paused_at TIMESTAMP,
  resumed_at TIMESTAMP,
  pause_reason VARCHAR(255),
  total_study_time INTEGER DEFAULT 0;

-- Vocab Plan에 학습 옵션 추가
ALTER TABLE student_vocab_plans ADD COLUMN IF NOT EXISTS
  max_concurrent_days INTEGER DEFAULT 1,
  days_per_session INTEGER DEFAULT 1,
  auto_advance_enabled BOOLEAN DEFAULT true;

-- 기존 데이터를 위해 기본값 설정
UPDATE student_vocab_plans
SET max_concurrent_days = 1,
    days_per_session = 1,
    auto_advance_enabled = true
WHERE max_concurrent_days IS NULL;
