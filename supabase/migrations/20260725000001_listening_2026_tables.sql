-- Listening Tests Table
CREATE TABLE IF NOT EXISTS listening_tests (
  id UUID PRIMARY KEY,
  label TEXT NOT NULL,
  exam_era TEXT DEFAULT 'ibt_2026',
  content JSONB NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'locked', 'archived')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Listening Sessions Table
CREATE TABLE IF NOT EXISTS listening_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_id UUID NOT NULL REFERENCES listening_tests(id) ON DELETE CASCADE,
  module SMALLINT NOT NULL CHECK (module IN (1, 2)),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('hard', 'easy')),
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Listening Answers Table
CREATE TABLE IF NOT EXISTS listening_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES listening_sessions(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  chosen_choice_index SMALLINT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  time_spent SMALLINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Listening Results Table
CREATE TABLE IF NOT EXISTS listening_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES listening_sessions(id) ON DELETE CASCADE,
  module SMALLINT NOT NULL CHECK (module IN (1, 2)),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('hard', 'easy')),
  correct_count SMALLINT NOT NULL,
  total_questions SMALLINT NOT NULL,
  percentage SMALLINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_listening_sessions_user_id ON listening_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_listening_sessions_test_id ON listening_sessions(test_id);
CREATE INDEX IF NOT EXISTS idx_listening_answers_session_id ON listening_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_listening_results_session_id ON listening_results(session_id);

-- Enable Row Level Security
ALTER TABLE listening_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE listening_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE listening_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE listening_results ENABLE ROW LEVEL SECURITY;

-- Policies for listening_tests (anyone can read public tests)
CREATE POLICY "Public tests readable by authenticated users" ON listening_tests
  FOR SELECT USING (status = 'locked' AND auth.role() = 'authenticated');

-- Policies for listening_sessions (users can only see their own)
CREATE POLICY "Users can view their own sessions" ON listening_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions" ON listening_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for listening_answers (users can only see their own)
CREATE POLICY "Users can view their own answers" ON listening_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM listening_sessions
      WHERE listening_sessions.id = listening_answers.session_id
      AND listening_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert answers for their sessions" ON listening_answers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM listening_sessions
      WHERE listening_sessions.id = listening_answers.session_id
      AND listening_sessions.user_id = auth.uid()
    )
  );

-- Policies for listening_results (users can only see their own)
CREATE POLICY "Users can view their own results" ON listening_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM listening_sessions
      WHERE listening_sessions.id = listening_results.session_id
      AND listening_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert results for their sessions" ON listening_results
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM listening_sessions
      WHERE listening_sessions.id = listening_results.session_id
      AND listening_sessions.user_id = auth.uid()
    )
  );
