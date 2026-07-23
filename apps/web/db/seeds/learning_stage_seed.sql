-- Learning Stage 테스트 데이터 생성 스크립트
-- Supabase SQL Editor에서 실행할 것

-- 주의: 기존 데이터를 덮어씌우지 않도록 IF NOT EXISTS 사용

-- Step 1: 기존 words 테이블에서 첫 10개 단어로 학습 데이터 생성
INSERT INTO learning_stage_items (
  word_id,
  given_spelling,
  meaning_1,
  meaning_1_en,
  meaning_2,
  meaning_2_en,
  meaning_context,
  meaning_related_words,
  meaning_definition_en,
  quiz_synonyms,
  quiz_example_en,
  quiz_example_ko,
  quiz_choices,
  data_status,
  mojibake_detected
)
SELECT
  w.id,
  w.word,
  w.meanings_ko[1],
  w.meanings_en[1],
  CASE WHEN array_length(w.meanings_ko, 1) > 1 THEN w.meanings_ko[2] ELSE NULL END,
  CASE WHEN array_length(w.meanings_en, 1) > 1 THEN w.meanings_en[2] ELSE NULL END,
  NULL,
  '["related1", "related2"]'::jsonb,
  'This word has multiple meanings and uses.',
  '["synonym1", "synonym2"]'::jsonb,
  'This is an example sentence using the word ' || w.word || '.',
  '이것은 ' || w.word || '를 사용한 예문입니다.',
  '[
    {"id": 1, "text": "' || COALESCE(w.meanings_ko[1], 'meaning1') || '", "is_correct": true},
    {"id": 2, "text": "오답1", "is_correct": false},
    {"id": 3, "text": "오답2", "is_correct": false},
    {"id": 4, "text": "오답3", "is_correct": false}
  ]'::jsonb,
  'clean',
  false
FROM words w
WHERE w.id NOT IN (SELECT word_id FROM learning_stage_items)
LIMIT 10
ON CONFLICT DO NOTHING;

-- Step 2: 테스트 학생 계정으로 시도 기록 생성 (선택)
-- 주의: academy_students에서 실제 학생 ID를 사용해야 함
-- 아래는 예시이며, 실제 학생 ID로 변경 필요

INSERT INTO learning_stage_attempts (
  student_id,
  word_id,
  spelling_attempt,
  spelling_correct,
  spelling_attempts,
  meaning_viewed,
  quiz_answer,
  quiz_correct,
  quiz_attempts,
  tab_sequence,
  time_spent_total,
  completed_at
)
SELECT
  DISTINCT ON (s.id) s.id,
  (SELECT word_id FROM learning_stage_items LIMIT 1),
  'APPRECIATE',
  true,
  1,
  true,
  1,
  true,
  1,
  '["spelling", "meaning", "quiz"]'::jsonb,
  120,
  NOW()
FROM academy_students s
LIMIT 5
ON CONFLICT (student_id, word_id) DO NOTHING;

-- Step 3: 검증 확인

-- 생성된 데이터 확인
SELECT
  COUNT(*) as total_learning_items,
  SUM(CASE WHEN data_status = 'clean' THEN 1 ELSE 0 END) as clean,
  SUM(CASE WHEN mojibake_detected THEN 1 ELSE 0 END) as with_mojibake
FROM learning_stage_items;

-- 시도 기록 확인
SELECT
  COUNT(*) as total_attempts,
  SUM(CASE WHEN spelling_correct THEN 1 ELSE 0 END) as correct_spelling,
  SUM(CASE WHEN quiz_correct THEN 1 ELSE 0 END) as correct_quiz
FROM learning_stage_attempts;

-- 플래그 확인 (아직 없어야 함)
SELECT COUNT(*) as total_flags FROM learning_stage_flags;
