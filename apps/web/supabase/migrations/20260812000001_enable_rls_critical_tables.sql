-- Phase 1: Enable RLS on Critical Tables (User & Auth Related)
-- This migration enables Row Level Security on all critical tables
-- that were already created with RLS policies but RLS wasn't enabled

BEGIN;

-- Critical User & Auth Tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy_class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy_class_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_activity_weak_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Session & Attempt Data (PII - session_id sensitive)
ALTER TABLE reading_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_session_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_adaptive_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_adaptive_answers ENABLE ROW LEVEL SECURITY;

ALTER TABLE listening_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE listening_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE listening_play_counters ENABLE ROW LEVEL SECURITY;

ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE writing_2026_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE writing_2026_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE writing_outlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE writing_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE writing_rubrics ENABLE ROW LEVEL SECURITY;

ALTER TABLE speaking_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shadowing_attempts ENABLE ROW LEVEL SECURITY;

-- Test & Assignment Data
ALTER TABLE test_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_tasks ENABLE ROW LEVEL SECURITY;

-- Reading Drills & Exercises
ALTER TABLE drill_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE drill_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE drill_word_results ENABLE ROW LEVEL SECURITY;

-- Naesin Platform Data
ALTER TABLE naesin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE naesin_reading_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE naesin_reading_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE naesin_reading_analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE naesin_reading_session_analysis_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE naesin_reading_review_evidence_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE naesin_reading_review_sentence_analysis_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE naesin_reading_review_unknown_word_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE naesin_reading_review_vocab_logs ENABLE ROW LEVEL SECURITY;

-- Hi-Naesin Platform Data
ALTER TABLE hi_naesin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hi_naesin_drills ENABLE ROW LEVEL SECURITY;
ALTER TABLE hi_naesin_drill_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE hi_naesin_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE hi_naesin_passages ENABLE ROW LEVEL SECURITY;
ALTER TABLE hi_naesin_passage_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE hi_naesin_variant_answers ENABLE ROW LEVEL SECURITY;

-- Vocab & Learning Data
ALTER TABLE vocab_drill_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocab_exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocab_learning_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_vocab_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_vocab_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_vocab_breaks ENABLE ROW LEVEL SECURITY;

-- Other Data
ALTER TABLE digital_writing_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_writing_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE speed_challenge_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE speed_challenge_try_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_problem_history_2026 ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_problem_history_2026 ENABLE ROW LEVEL SECURITY;

COMMIT;
