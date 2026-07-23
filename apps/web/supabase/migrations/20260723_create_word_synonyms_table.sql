-- Word Synonyms 테이블
-- 단어 간 동의어/유의어 관계 정의

CREATE TABLE IF NOT EXISTS word_synonyms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word_id UUID NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  synonym_word_id UUID NOT NULL REFERENCES words(id) ON DELETE CASCADE,

  -- Synonym Tier (정확도 수준)
  -- tier 1: 정의상 동의어 (거의 같은 의미)
  -- tier 2: 유의어 (비슷한 의미, 미묘한 차이)
  -- tier 3: 관련어 (관련 있는 의미)
  tier INT NOT NULL DEFAULT 1,

  -- 관계 유형
  relationship_type TEXT NOT NULL DEFAULT 'synonym', -- synonym, similar, related

  -- 유사도 점수 (0~100)
  similarity_score INT NOT NULL DEFAULT 100,

  -- 메타데이터
  source TEXT, -- 데이터 출처 (wordnet, datamuse, etc)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 중복 방지 (같은 word_id와 synonym_word_id의 조합은 1개만)
  UNIQUE(word_id, synonym_word_id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_word_synonyms_word_id ON word_synonyms(word_id);
CREATE INDEX IF NOT EXISTS idx_word_synonyms_synonym_word_id ON word_synonyms(synonym_word_id);
CREATE INDEX IF NOT EXISTS idx_word_synonyms_tier ON word_synonyms(tier);
CREATE INDEX IF NOT EXISTS idx_word_synonyms_similarity_score ON word_synonyms(similarity_score DESC);

-- RLS (Row Level Security)
ALTER TABLE word_synonyms ENABLE ROW LEVEL SECURITY;

-- 정책: 모든 사용자가 읽을 수 있음 (공개 데이터)
CREATE POLICY "Anyone can view word synonyms"
  ON word_synonyms FOR SELECT
  USING (true);
