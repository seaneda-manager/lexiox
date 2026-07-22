-- Migration: Add default_vocab_book_id to academy_students
-- Date: 2026-07-22
-- Description: Allows admin to assign a default vocabulary book to each student

ALTER TABLE academy_students
ADD COLUMN IF NOT EXISTS default_vocab_book_id VARCHAR(255);

COMMENT ON COLUMN academy_students.default_vocab_book_id IS 'Default vocabulary track/book for this student (FK to vocab_tracks.id)';

CREATE INDEX IF NOT EXISTS idx_academy_students_default_vocab_book
ON academy_students(default_vocab_book_id);
