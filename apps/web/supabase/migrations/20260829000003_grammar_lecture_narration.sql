-- AI 문법 강의(판서 + 선생님 클론 음성): 설명 세그먼트에 내레이션 스크립트 + 오디오 URL 추가.
-- 'board' 세그먼트 타입(판서용)은 type(자유 text) + content(jsonb)라 스키마 변경 불필요.

ALTER TABLE grammar_2026_explanation_segments
  ADD COLUMN IF NOT EXISTS narration text,
  ADD COLUMN IF NOT EXISTS audio_url text;

COMMENT ON COLUMN grammar_2026_explanation_segments.narration IS 'TTS로 읽을 내레이션 스크립트 (한국어 설명 + 영어 예문 혼합, 클론 음성)';
COMMENT ON COLUMN grammar_2026_explanation_segments.audio_url IS 'narration의 ElevenLabs TTS 결과 (Supabase content 버킷)';
