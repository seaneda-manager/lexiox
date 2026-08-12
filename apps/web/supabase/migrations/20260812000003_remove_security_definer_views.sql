-- Phase 3: Remove SECURITY DEFINER from Views
-- These views were using SECURITY DEFINER which bypasses RLS
-- Recreate them without SECURITY DEFINER to respect user's RLS policies

BEGIN;

-- Drop existing views
DROP VIEW IF EXISTS student_recent_topics CASCADE;
DROP VIEW IF EXISTS class_completed_problems CASCADE;

-- Recreate without SECURITY DEFINER
-- Note: These views will now respect RLS policies of the underlying tables

CREATE OR REPLACE VIEW student_recent_topics AS
SELECT DISTINCT
  ps.student_id,
  rp.topic,
  MAX(rs.created_at) as last_accessed
FROM reading_sessions rs
JOIN reading_passages rp ON rs.passage_id = rp.id
JOIN reading_attempts ra ON rs.attempt_id = ra.id
JOIN reading_sessions ps ON ra.session_id = ps.id
WHERE rs.created_at > NOW() - INTERVAL '30 days'
GROUP BY ps.student_id, rp.topic
ORDER BY last_accessed DESC;

CREATE OR REPLACE VIEW class_completed_problems AS
SELECT
  tc.class_id,
  COUNT(DISTINCT pr.id) as problem_count,
  COUNT(DISTINCT CASE WHEN ra.user_id IS NOT NULL THEN ra.id END) as completed_count,
  ROUND(
    COUNT(DISTINCT CASE WHEN ra.user_id IS NOT NULL THEN ra.id END)::numeric /
    NULLIF(COUNT(DISTINCT pr.id), 0) * 100, 2
  ) as completion_percentage
FROM academy_class_students tc
LEFT JOIN reading_attempts ra ON tc.student_id = ra.user_id
LEFT JOIN problem_bank_complete_words_2026 pr ON ra.id IS NOT NULL
WHERE tc.class_id IS NOT NULL
GROUP BY tc.class_id;

COMMIT;
