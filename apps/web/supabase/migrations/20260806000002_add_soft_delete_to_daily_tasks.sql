-- Add soft delete support to daily_tests table
-- This allows us to preserve data while marking tasks as deleted

ALTER TABLE daily_tests ADD COLUMN deleted_at TIMESTAMP;

-- Index for soft delete queries (only active tasks)
CREATE INDEX idx_daily_tests_active ON daily_tests(created_at DESC)
WHERE deleted_at IS NULL;

-- Index for filtering by deletion status
CREATE INDEX idx_daily_tests_deleted ON daily_tests(deleted_at DESC)
WHERE deleted_at IS NOT NULL;
