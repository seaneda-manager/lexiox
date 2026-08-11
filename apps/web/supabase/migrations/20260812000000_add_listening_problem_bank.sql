-- Listening Problem Bank Tables for Daily Task System
-- ====================================================

-- 1. Listening Response (1번 유형) 문제 저장소
CREATE TABLE IF NOT EXISTS problem_bank_listening_response_2026 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 메타정보
  topic VARCHAR(255) NOT NULL,           -- "Campus life", "Travel", etc.
  difficulty VARCHAR(50) NOT NULL,       -- "easy" | "core" | "hard"

  -- 콘텐츠
  audio_url TEXT NOT NULL,                -- Audio file URL
  question JSONB NOT NULL,                -- { id, stem, choices[4], correct: 'a'|'b'|'c'|'d' }
  transcript TEXT,                        -- 선택: 음성 스크립트

  -- 출처
  source_test_id UUID,                    -- 어느 Full Test에서 나왔는지
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_listening_response_topic ON problem_bank_listening_response_2026(topic);
CREATE INDEX idx_listening_response_difficulty ON problem_bank_listening_response_2026(difficulty);
CREATE INDEX idx_listening_response_created ON problem_bank_listening_response_2026(created_at DESC);

-- 2. Listening Track (2/3/4번 유형 - Conversation/Announcement/Lecture) 문제 저장소
CREATE TABLE IF NOT EXISTS problem_bank_listening_track_2026 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 메타정보
  topic VARCHAR(255) NOT NULL,           -- "Biology lecture", "Student services" etc.
  difficulty VARCHAR(50) NOT NULL,       -- "easy" | "core" | "hard"
  track_type VARCHAR(50) NOT NULL,       -- "conversation" | "announcement" | "lecture"

  -- 콘텐츠
  audio_url TEXT NOT NULL,                -- Audio file URL
  transcript TEXT,                        -- 음성 스크립트 (선택)
  questions JSONB NOT NULL,               -- [ { id, number, stem, choices[4], correct: 'a'|'b'|'c'|'d' } ] x4

  -- 출처
  source_test_id UUID,                    -- 어느 Full Test에서 나왔는지
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_listening_track_topic ON problem_bank_listening_track_2026(topic);
CREATE INDEX idx_listening_track_difficulty ON problem_bank_listening_track_2026(difficulty);
CREATE INDEX idx_listening_track_type ON problem_bank_listening_track_2026(track_type);
CREATE INDEX idx_listening_track_created ON problem_bank_listening_track_2026(created_at DESC);
