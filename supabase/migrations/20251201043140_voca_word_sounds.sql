-- ============================================================
-- VOCA – Word Sounds (4D Reinforcement)
-- 각 단어에 연결되는 짧은 사운드 / 징글 / 효과음 정보
-- ============================================================

CREATE TABLE IF NOT EXISTS voca_word_sounds (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word_id     uuid NOT NULL REFERENCES voca_words(id) ON DELETE CASCADE,

  -- sound 종류:
  -- literal  : 단어 의미와 직접 연결된 효과음 (예: rain -> 빗소리)
  -- emotion  : 단어의 감정 톤을 표현하는 사운드 (예: melancholy -> 저음 피아노)
  -- jingle   : 단어 캐릭터를 상징하는 짧은 멜로디
  sound_type  text NOT NULL CHECK (sound_type IN ('literal', 'emotion', 'jingle')),

  -- 실제 오디오 파일이 올라가는 위치 (Supabase Storage URL 등)
  audio_url   text NOT NULL,

  -- 선택: 간단한 설명/노트 (어디에 쓰는지, 느낌 등)
  description text DEFAULT '',

  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- word_id + sound_type 로 빠르게 찾기 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_voca_word_sounds_word_id
  ON voca_word_sounds(word_id);

CREATE INDEX IF NOT EXISTS idx_voca_word_sounds_word_type
  ON voca_word_sounds(word_id, sound_type);

-- ============================================================
-- END
-- ============================================================
