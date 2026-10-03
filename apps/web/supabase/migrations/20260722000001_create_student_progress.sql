-- Migration: Create Student_Progress table for Dynamic Queue Vocab System
-- Date: 2026-07-22
-- Description: Creates the core logging table for real-time vocabulary progress tracking
-- Mapping: vocab_tracks → vocabulary_books, vocab_sets → chapters

-- 1. Create Student_Progress table (core logging table)
-- Maps to: member_id (academy_students.id), book_id (vocab_tracks.id), chapter_id (vocab_sets.id)
CREATE TABLE IF NOT EXISTS student_progress (
  progress_id BIGSERIAL PRIMARY KEY,
  member_id VARCHAR(255) NOT NULL,
  book_id VARCHAR(255) NOT NULL,  -- FK to vocab_tracks.id
  chapter_id VARCHAR(255) NOT NULL,  -- FK to vocab_sets.id
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_student_progress_member_book
ON student_progress(member_id, book_id);

CREATE INDEX IF NOT EXISTS idx_student_progress_member_completed
ON student_progress(member_id, completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_student_progress_member_book_completed
ON student_progress(member_id, book_id, completed_at DESC);

-- 3. Comment for clarity
COMMENT ON TABLE student_progress IS 'Real-time progress logging for vocabulary learning. Each row represents a completed day.';
COMMENT ON COLUMN student_progress.member_id IS 'Foreign key to academy_students.id';
COMMENT ON COLUMN student_progress.book_id IS 'Foreign key to vocab_tracks.id';
COMMENT ON COLUMN student_progress.chapter_id IS 'Foreign key to vocab_sets.id';
