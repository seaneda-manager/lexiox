-- Problem Bank Tables for Daily Task System
-- ============================================

-- 1. Feel in the Blank (Complete Words) 문제 저장소
CREATE TABLE IF NOT EXISTS problem_bank_complete_words_2026 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 메타정보
  topic VARCHAR(255) NOT NULL,           -- "Banking", "Travel", "Restaurant" etc.
  difficulty VARCHAR(50) NOT NULL,       -- "easy" | "core" | "hard"

  -- 콘텐츠
  paragraph_html TEXT NOT NULL,          -- "Students must regi__ their vehicles"
  blanks JSONB NOT NULL,                 -- [ { id, order, correctToken }, ... ] x10

  -- 출처
  source_test_id UUID,                   -- 어느 Full Test에서 나왔는지
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- 인덱싱
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_complete_words_topic ON problem_bank_complete_words_2026(topic);
CREATE INDEX idx_complete_words_difficulty ON problem_bank_complete_words_2026(difficulty);
CREATE INDEX idx_complete_words_created ON problem_bank_complete_words_2026(created_at DESC);

-- 2. Daily Life 문제 저장소
CREATE TABLE IF NOT EXISTS problem_bank_daily_life_2026 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 메타정보
  topic VARCHAR(255) NOT NULL,           -- "Library hours", "Dorm conflict" etc.
  difficulty VARCHAR(50) NOT NULL,
  context_type VARCHAR(50) NOT NULL,    -- "notice" | "email" | "social_post" | "web_article" | "other"

  -- 콘텐츠
  content_html TEXT NOT NULL,            -- HTML formatted (email/notice/etc.)
  questions JSONB NOT NULL,              -- [ { id, number, type, stem, choices[4], ... } ] x3-4

  -- 출처
  source_test_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_daily_life_topic ON problem_bank_daily_life_2026(topic);
CREATE INDEX idx_daily_life_difficulty ON problem_bank_daily_life_2026(difficulty);
CREATE INDEX idx_daily_life_created ON problem_bank_daily_life_2026(created_at DESC);

-- 3. Academic Passage 문제 저장소
CREATE TABLE IF NOT EXISTS problem_bank_academic_passage_2026 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 메타정보
  topic VARCHAR(255) NOT NULL,           -- "Marine biology", "Psychology" etc.
  difficulty VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,

  -- 콘텐츠
  passage_html TEXT NOT NULL,            -- 3 paragraphs, ~200-250 words
  questions JSONB NOT NULL,              -- [ { id, number, type, stem, choices[4], meta?, ... } ] x5

  -- 출처
  source_test_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_academic_topic ON problem_bank_academic_passage_2026(topic);
CREATE INDEX idx_academic_difficulty ON problem_bank_academic_passage_2026(difficulty);
CREATE INDEX idx_academic_created ON problem_bank_academic_passage_2026(created_at DESC);

-- 4. 학생의 문제 풀이 기록
CREATE TABLE IF NOT EXISTS student_problem_history_2026 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 문제 참조 (3가지 타입 중 하나)
  problem_type VARCHAR(50) NOT NULL,     -- "complete_words" | "daily_life" | "academic_passage"
  problem_id UUID NOT NULL,

  -- 풀이 정보
  completed_at TIMESTAMP NOT NULL,
  score FLOAT,                           -- 0-1 (optional)
  is_correct BOOLEAN,                    -- 전체 맞았는지
  time_spent_seconds INT,                -- 소요 시간

  -- 추가 정보
  assignment_id UUID,                    -- 어떤 숙제/task에서 푼 건지
  daily_task_id UUID,                    -- Daily Task ID (foreign key는 나중에 추가)

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_student_history_student ON student_problem_history_2026(student_id);
CREATE INDEX idx_student_history_problem ON student_problem_history_2026(problem_type, problem_id);
CREATE INDEX idx_student_history_completed ON student_problem_history_2026(completed_at DESC);

-- 5. Class별 문제 풀이 기록
CREATE TABLE IF NOT EXISTS class_problem_history_2026 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  class_id UUID NOT NULL,                -- references classes table

  -- 문제 참조
  problem_type VARCHAR(50) NOT NULL,
  problem_id UUID NOT NULL,

  -- 할당 정보
  assigned_date TIMESTAMP NOT NULL,
  num_students_assigned INT,
  num_students_completed INT DEFAULT 0,

  -- 추가
  assignment_id UUID,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_class_history_class ON class_problem_history_2026(class_id);
CREATE INDEX idx_class_history_problem ON class_problem_history_2026(problem_type, problem_id);

-- 6. Topic Usage Tracker (중복 방지용)
CREATE TABLE IF NOT EXISTS problem_topic_tracker_2026 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  problem_type VARCHAR(50) NOT NULL,
  topic VARCHAR(255) NOT NULL,

  -- 언제 마지막으로 풀었는지
  last_solved_date DATE,
  solve_count INT DEFAULT 1,

  -- 다음 사용 가능 날짜 (30일 기본)
  available_after_date DATE,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_topic_tracker_unique
  ON problem_topic_tracker_2026(student_id, problem_type, topic);
CREATE INDEX idx_topic_tracker_available ON problem_topic_tracker_2026(available_after_date);

-- ============================================
-- Views for easier querying
-- ============================================

-- 학생이 최근에 푼 모든 topic 조회
CREATE OR REPLACE VIEW student_recent_topics AS
SELECT
  ptt.student_id,
  ptt.problem_type,
  ptt.topic,
  ptt.last_solved_date,
  (ptt.available_after_date > CURRENT_DATE) as is_blocked
FROM problem_topic_tracker_2026 ptt
WHERE ptt.available_after_date > CURRENT_DATE - INTERVAL '90 days';

-- Class별 풀이된 문제 목록
CREATE OR REPLACE VIEW class_completed_problems AS
SELECT DISTINCT
  cph.class_id,
  cph.problem_type,
  cph.problem_id,
  COUNT(*) as times_assigned
FROM class_problem_history_2026 cph
GROUP BY cph.class_id, cph.problem_type, cph.problem_id;

-- 7. Daily Tests (Daily Task 시스템용)
CREATE TABLE IF NOT EXISTS daily_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 과제 정보
  task_type VARCHAR(50) NOT NULL,       -- "light" | "medium_1" | "medium_2" | "medium_3" | "medium_4"
  difficulty VARCHAR(50) NOT NULL,      -- "easy" | "core" | "hard"

  -- 문제 ID들 (배열)
  complete_words_ids UUID[] DEFAULT '{}',
  daily_life_ids UUID[] DEFAULT '{}',
  academic_passage_ids UUID[] DEFAULT '{}',

  -- 할당 정보
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id UUID,                         -- references classes(id) - soft reference

  -- 날짜
  assigned_date TIMESTAMP DEFAULT NOW(),
  due_date TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,

  -- 상태
  status VARCHAR(50) DEFAULT 'assigned', -- "assigned" | "in_progress" | "completed" | "overdue"
  total_score INT,                       -- 총점 (선택)

  -- 관리
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_daily_tests_student ON daily_tests(student_id);
CREATE INDEX idx_daily_tests_class ON daily_tests(class_id);
CREATE INDEX idx_daily_tests_status ON daily_tests(status);
CREATE INDEX idx_daily_tests_due_date ON daily_tests(due_date);
CREATE INDEX idx_daily_tests_created ON daily_tests(created_at DESC);

-- ============================================
-- RLS (Row Level Security) for daily_tests
-- ============================================

ALTER TABLE daily_tests ENABLE ROW LEVEL SECURITY;

-- 학생은 자신의 Daily Tests만 조회 가능
DROP POLICY IF EXISTS "Students can view their own daily tests" ON daily_tests;
CREATE POLICY "Students can view their own daily tests"
  ON daily_tests
  FOR SELECT
  USING (auth.uid() = student_id);

-- Admin (service_role)은 모든 Daily Tests 조회/수정 가능
DROP POLICY IF EXISTS "Admin can manage all daily tests" ON daily_tests;
CREATE POLICY "Admin can manage all daily tests"
  ON daily_tests
  FOR ALL
  USING (auth.role() = 'service_role');

-- 생성자는 자신이 생성한 과제 수정 가능
DROP POLICY IF EXISTS "Creators can update their daily tests" ON daily_tests;
CREATE POLICY "Creators can update their daily tests"
  ON daily_tests
  FOR UPDATE
  USING (auth.uid() = created_by);
