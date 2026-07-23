-- Synonym Game 관련 테이블

-- 게임 세션
CREATE TABLE IF NOT EXISTS vocab_game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  game_type TEXT NOT NULL,
  total_points INTEGER DEFAULT 0,
  final_level INTEGER DEFAULT 1,
  question_count INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 게임 결과 (개별 문제)
CREATE TABLE IF NOT EXISTS vocab_game_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_session_id UUID NOT NULL REFERENCES vocab_game_sessions(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT FALSE,
  points_gained INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 사용자 게임 통계
CREATE TABLE IF NOT EXISTS user_vocab_game_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  game_type TEXT NOT NULL,
  total_points INTEGER DEFAULT 0,
  total_games INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  best_level INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, game_type),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_vocab_game_sessions_user_id ON vocab_game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_vocab_game_sessions_created_at ON vocab_game_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_vocab_game_results_game_session_id ON vocab_game_results(game_session_id);
CREATE INDEX IF NOT EXISTS idx_user_vocab_game_stats_user_id ON user_vocab_game_stats(user_id);

-- RLS (Row Level Security)
ALTER TABLE vocab_game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocab_game_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_vocab_game_stats ENABLE ROW LEVEL SECURITY;

-- 정책: 사용자는 자신의 세션만 조회 가능
CREATE POLICY "Users can view their own game sessions"
  ON vocab_game_sessions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own game sessions"
  ON vocab_game_sessions FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 정책: 사용자는 자신의 결과만 조회 가능
CREATE POLICY "Users can view their own game results"
  ON vocab_game_results FOR SELECT
  USING (
    game_session_id IN (
      SELECT id FROM vocab_game_sessions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own game results"
  ON vocab_game_results FOR INSERT
  WITH CHECK (
    game_session_id IN (
      SELECT id FROM vocab_game_sessions WHERE user_id = auth.uid()
    )
  );

-- 정책: 사용자는 자신의 통계만 조회/수정 가능
CREATE POLICY "Users can view their own stats"
  ON user_vocab_game_stats FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own stats"
  ON user_vocab_game_stats FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own stats"
  ON user_vocab_game_stats FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
