-- 깜지 숙제 테이블
CREATE TABLE IF NOT EXISTS vocab_student_homework (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 기본 정보
  student_id UUID NOT NULL REFERENCES academy_students(id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  word_text VARCHAR(255) NOT NULL,
  pos VARCHAR(50),
  meanings JSONB DEFAULT '[]'::jsonb,

  -- 숙제 유형
  homework_type VARCHAR(20) NOT NULL CHECK (homework_type IN ('text', 'audio')),

  -- 진행 상황
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  points INTEGER DEFAULT 0,
  completed_at TIMESTAMP,

  -- 시간 추적
  created_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- 유니크 제약 (학생별, 단어별, 날짜별 1개만)
  UNIQUE (student_id, word_id, created_date)
);

-- 인덱스
CREATE INDEX idx_vocab_homework_student_id ON vocab_student_homework(student_id);
CREATE INDEX idx_vocab_homework_status ON vocab_student_homework(status);
CREATE INDEX idx_vocab_homework_created_at ON vocab_student_homework(created_at);

-- 일일 포인트 집계 테이블
CREATE TABLE IF NOT EXISTS vocab_daily_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  student_id UUID NOT NULL REFERENCES academy_students(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,

  total_points INTEGER DEFAULT 0,
  homework_count INTEGER DEFAULT 0,
  completed_count INTEGER DEFAULT 0,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE (student_id, date)
);

CREATE INDEX idx_vocab_daily_points_student ON vocab_daily_points(student_id);
CREATE INDEX idx_vocab_daily_points_date ON vocab_daily_points(date);

-- 포인트 상세 기록 테이블
CREATE TABLE IF NOT EXISTS vocab_point_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  student_id UUID NOT NULL REFERENCES academy_students(id) ON DELETE CASCADE,
  homework_id UUID REFERENCES vocab_student_homework(id) ON DELETE SET NULL,

  point_type VARCHAR(50) NOT NULL, -- 'pronunciation', 'spelling', 'meaning', 'cycle_bonus', 'master_bonus', 'method_bonus'
  points INTEGER NOT NULL,

  metadata JSONB, -- 상세 정보 저장 (e.g., {"cycle": 1, "score": "Great"})

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vocab_point_logs_student ON vocab_point_logs(student_id);
CREATE INDEX idx_vocab_point_logs_homework ON vocab_point_logs(homework_id);
CREATE INDEX idx_vocab_point_logs_type ON vocab_point_logs(point_type);
