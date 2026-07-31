-- Add review_attempts (JSONB) to all result tables
-- Stores per-attempt data: grammar/pronunciation errors, completion stage, timestamp

-- Reading
ALTER TABLE public.reading_results_2026
ADD COLUMN IF NOT EXISTS review_attempts jsonb DEFAULT '[]'::jsonb;

-- Listening
ALTER TABLE public.listening_results_2026
ADD COLUMN IF NOT EXISTS review_attempts jsonb DEFAULT '[]'::jsonb;

-- Writing
ALTER TABLE public.writing_2026_sessions
ADD COLUMN IF NOT EXISTS review_attempts jsonb DEFAULT '[]'::jsonb;

-- Speaking
ALTER TABLE public.speaking_results_2026
ADD COLUMN IF NOT EXISTS review_attempts jsonb DEFAULT '[]'::jsonb;

-- Index for faster JSONB queries (optional but useful)
CREATE INDEX IF NOT EXISTS idx_writing_review_attempts
  ON public.writing_2026_sessions USING gin(review_attempts);

CREATE INDEX IF NOT EXISTS idx_speaking_review_attempts
  ON public.speaking_results_2026 USING gin(review_attempts);

CREATE INDEX IF NOT EXISTS idx_reading_review_attempts
  ON public.reading_results_2026 USING gin(review_attempts);

CREATE INDEX IF NOT EXISTS idx_listening_review_attempts
  ON public.listening_results_2026 USING gin(review_attempts);
