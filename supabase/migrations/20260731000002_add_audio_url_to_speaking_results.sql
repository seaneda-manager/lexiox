-- Add audio_url column to speaking_results_2026
ALTER TABLE public.speaking_results_2026
ADD COLUMN IF NOT EXISTS audio_url TEXT;

CREATE INDEX IF NOT EXISTS idx_speaking_results_2026_audio_url
ON public.speaking_results_2026 (audio_url);
