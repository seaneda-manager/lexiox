-- Fix: Remove SECURITY DEFINER from views to respect RLS policies
-- Resolves Supabase lint warnings for student_recent_topics and class_completed_problems

BEGIN;

-- Drop existing views
DROP VIEW IF EXISTS public.student_recent_topics CASCADE;
DROP VIEW IF EXISTS public.class_completed_problems CASCADE;

-- Recreate without SECURITY DEFINER
-- Views will now respect RLS policies of the querying user
CREATE VIEW public.student_recent_topics AS
SELECT DISTINCT
  student_id,
  topic,
  MAX(created_at) as last_accessed
FROM (
  SELECT
    student_id,
    'reading' as topic,
    created_at
  FROM reading_results_2026
  WHERE created_at > NOW() - INTERVAL '30 days'
) subq
GROUP BY student_id, topic
ORDER BY last_accessed DESC;

CREATE VIEW public.class_completed_problems AS
SELECT
  class_id,
  COUNT(*) as total_problems,
  COUNT(CASE WHEN is_correct THEN 1 END) as correct_count,
  ROUND(
    COUNT(CASE WHEN is_correct THEN 1 END)::numeric /
    NULLIF(COUNT(*), 0) * 100, 2
  ) as completion_percentage
FROM (
  SELECT DISTINCT
    c.class_id,
    p.id,
    sh.is_correct
  FROM problem_bank_complete_words_2026 p
  LEFT JOIN student_problem_history sh ON p.id = sh.problem_id
  LEFT JOIN (
    SELECT DISTINCT student_id, class_id
    FROM academy_class_students
  ) c ON sh.student_id = c.student_id
  WHERE c.class_id IS NOT NULL
) subq
GROUP BY class_id;

COMMIT;
