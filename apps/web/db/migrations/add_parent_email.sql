-- Add parent_email column to academy_students table
ALTER TABLE academy_students
ADD COLUMN IF NOT EXISTS parent_email TEXT;

-- Add comment
COMMENT ON COLUMN academy_students.parent_email IS '학부모 이메일 (공지 발송용)';
