-- Add learning_option column to student_vocab_plans
-- Options: 1=Traditional (원내학습), 2=Advanced (집예습), 3=Simple (간략학습), 4=BookOnly (책학습)

ALTER TABLE student_vocab_plans
ADD COLUMN learning_option INTEGER DEFAULT 1 CHECK (learning_option IN (1, 2, 3, 4));

CREATE INDEX idx_student_vocab_plans_learning_option
ON student_vocab_plans(student_id, track_id, learning_option);
