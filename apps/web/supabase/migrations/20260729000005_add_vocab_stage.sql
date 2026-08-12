-- Add stage column to student_vocab_assignments
ALTER TABLE student_vocab_assignments
ADD COLUMN IF NOT EXISTS stage INTEGER DEFAULT 1;

-- Set existing records to stage 1
UPDATE student_vocab_assignments SET stage = 1 WHERE stage IS NULL;

-- Make stage NOT NULL after data is set
DO $$ BEGIN
  ALTER TABLE student_vocab_assignments
  ALTER COLUMN stage SET NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_student_vocab_assignments_stage
ON student_vocab_assignments(student_id, track_id, stage, completed_at);
