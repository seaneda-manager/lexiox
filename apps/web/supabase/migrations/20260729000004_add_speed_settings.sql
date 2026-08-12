-- Add speed_timeout_seconds to vocab_tracks
ALTER TABLE vocab_tracks
ADD COLUMN IF NOT EXISTS speed_timeout_seconds INTEGER DEFAULT 15 CHECK (speed_timeout_seconds >= 2 AND speed_timeout_seconds <= 30);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_vocab_tracks_speed_timeout ON vocab_tracks(speed_timeout_seconds);

-- Update comment
COMMENT ON COLUMN vocab_tracks.speed_timeout_seconds IS 'Speed Challenge 타이머 초 단위 (2~30초)';
