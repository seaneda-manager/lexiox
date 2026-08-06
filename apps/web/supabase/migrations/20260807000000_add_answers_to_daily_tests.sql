-- Daily Task 제출 답안 저장용 컬럼 추가
ALTER TABLE daily_tests ADD COLUMN IF NOT EXISTS answers JSONB;
