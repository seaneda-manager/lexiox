-- Add track_id FK column to vocab_sets table
ALTER TABLE vocab_sets
ADD COLUMN track_id UUID REFERENCES vocab_tracks(id);

-- Index for better query performance
CREATE INDEX idx_vocab_sets_track_id ON vocab_sets(track_id);

-- Add comment for clarity
COMMENT ON COLUMN vocab_sets.track_id IS 'Foreign key to vocab_tracks - which track this set belongs to';
