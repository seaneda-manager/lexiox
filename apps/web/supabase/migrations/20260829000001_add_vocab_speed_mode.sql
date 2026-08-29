-- Vocab Speed 단계 버전 (full / simple)
--   full   = 기존 Speed (양방향 문항 + 70% 통과 게이트 + 오답 재도전 루프)
--   simple = 간략 Speed (모든 단어 1회씩만 물어보고, 오답 재도전 없이 바로 깜지)

-- 1) Track 기본값
ALTER TABLE vocab_tracks
ADD COLUMN IF NOT EXISTS speed_mode TEXT NOT NULL DEFAULT 'full'
  CHECK (speed_mode IN ('full', 'simple'));

COMMENT ON COLUMN vocab_tracks.speed_mode IS 'Speed 단계 기본 버전: full(정식) | simple(간략, 1회 후 바로 깜지)';

-- 2) 학생별 오버라이드 (NULL = Track 기본값을 따름)
ALTER TABLE student_vocab_plans
ADD COLUMN IF NOT EXISTS speed_mode TEXT
  CHECK (speed_mode IN ('full', 'simple'));

COMMENT ON COLUMN student_vocab_plans.speed_mode IS 'Speed 버전 학생별 오버라이드. NULL이면 vocab_tracks.speed_mode 사용';
