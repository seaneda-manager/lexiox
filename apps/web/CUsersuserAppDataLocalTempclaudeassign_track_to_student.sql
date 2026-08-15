-- 학생에게 track 할당
-- track: a1dfe7cf-7276-4ca9-aa37-2476f8e59fd7
-- student: test@example.com (user_id)

-- 먼저 user_id 확인
SELECT id, email FROM auth.users WHERE email = 'test@example.com' LIMIT 1;

-- student_vocab_assignments에 데이터 삽입
INSERT INTO student_vocab_assignments (
  student_id, 
  track_id, 
  day_index, 
  stage,
  status,
  completed_at
)
SELECT 
  u.id as student_id,
  'a1dfe7cf-7276-4ca9-aa37-2476f8e59fd7' as track_id,
  0 as day_index,
  'know' as stage,
  'completed' as status,
  NOW() as completed_at
FROM auth.users u
WHERE u.email = 'test@example.com'
ON CONFLICT (student_id, track_id, day_index, stage) 
DO UPDATE SET completed_at = NOW();
