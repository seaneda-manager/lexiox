-- Add direction column to student_vocab_plans
-- forward: 1-20 순서로 진행 (기본)
-- backward: 20-1 역순으로 진행

ALTER TABLE student_vocab_plans
ADD COLUMN direction TEXT DEFAULT 'forward' CHECK (direction IN ('forward', 'backward'));

CREATE INDEX idx_student_vocab_plans_direction
ON student_vocab_plans(student_id, track_id, direction);
