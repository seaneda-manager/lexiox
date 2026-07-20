-- Jr. Learning System 테스트 계정 및 데이터 설정
-- Supabase SQL Editor에서 실행

-- 1. 테스트 계정용 프로필 생성
-- (Auth 계정은 별도로 수동 생성 필요: admin@test.com, teacher@test.com, student@test.com)

-- Admin 프로필
INSERT INTO profiles (id, role, full_name, username)
VALUES ('11111111-1111-1111-1111-111111111111', 'admin', 'Test Admin', 'admin_test')
ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- Teacher 프로필
INSERT INTO profiles (id, role, full_name, username)
VALUES ('22222222-2222-2222-2222-222222222222', 'teacher', 'Test Teacher', 'teacher_test')
ON CONFLICT (id) DO UPDATE SET role = 'teacher';

-- Student 프로필
INSERT INTO profiles (id, role, full_name, username)
VALUES ('33333333-3333-3333-3333-333333333333', 'student', 'Test Student', 'student_test')
ON CONFLICT (id) DO UPDATE SET role = 'student';

-- 2. Teacher-Student 연결
INSERT INTO teacher_student_assignments (teacher_id, student_id)
VALUES ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333')
ON CONFLICT DO NOTHING;

-- 3. 테스트용 Reading 지문 생성
INSERT INTO jr_reading_passages (title, content, difficulty)
VALUES (
  'The Benefits of Meditation',
  'Meditation is an ancient practice that has been used for thousands of years to promote mental and physical well-being. In today''s fast-paced world, many people are turning to meditation as a way to reduce stress and improve their overall quality of life. Research has shown that regular meditation can help lower blood pressure, reduce anxiety, and improve sleep quality. There are many different types of meditation, including mindfulness meditation, guided visualization, and transcendental meditation. Despite their differences, they all share the common goal of achieving a state of mental clarity and peace.',
  'medium'
);

-- 4. 테스트용 Grammar 단원 생성
INSERT INTO jr_grammar_chapters (title, content, level, topic_area)
VALUES (
  'Present Perfect Tense',
  'The present perfect tense is used to describe actions that started in the past and continue to the present, or actions that happened in the recent past but have relevance to the present.

Formation: have/has + past participle

Examples:
- I have lived in Seoul for 5 years.
- She has studied English since 2020.
- They have just arrived at the station.

The present perfect is often used with:
- "for" (duration): I have worked here for 3 years
- "since" (starting point): She has been a teacher since 2019
- "just" (recent action): He has just finished his homework

Do not confuse with simple past tense!
- Simple Past: I went to Paris in 2020. (completed action, specific time)
- Present Perfect: I have been to Paris. (experience, relevant to now)',
  'high',
  'tense'
);

-- 5. 확인: 데이터 조회
SELECT '=== Profiles ===' as check_point;
SELECT id, role, full_name FROM profiles WHERE role IN ('admin', 'teacher', 'student') LIMIT 3;

SELECT '=== Reading Passages ===' as check_point;
SELECT id, title, difficulty FROM jr_reading_passages LIMIT 3;

SELECT '=== Grammar Chapters ===' as check_point;
SELECT id, title, level FROM jr_grammar_chapters LIMIT 3;

SELECT '=== Teacher-Student Assignments ===' as check_point;
SELECT teacher_id, student_id FROM teacher_student_assignments LIMIT 3;
