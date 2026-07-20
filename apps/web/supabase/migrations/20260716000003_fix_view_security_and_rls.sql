-- Fix view security and enable RLS on vocab tables

-- Recreate vocab_sets_with_counts with SECURITY INVOKER
DROP VIEW IF EXISTS public.vocab_sets_with_counts CASCADE;
CREATE VIEW public.vocab_sets_with_counts WITH (SECURITY_INVOKER = true) AS
SELECT vs.id,
    vs.title,
    vs.description,
    vs.grade_band,
    vs.level,
    vs.source_label,
    vs.track_id,
    vs.created_at,
    COALESCE(count(DISTINCT vsi.word_id), 0::bigint) AS word_count,
    COALESCE(count(*), 0::bigint) AS item_count
FROM vocab_sets vs
LEFT JOIN vocab_set_items vsi ON vs.id = vsi.set_id
GROUP BY vs.id, vs.title, vs.description, vs.grade_band, vs.level, vs.source_label, vs.track_id, vs.created_at;

-- Enable RLS on underlying tables
ALTER TABLE public.vocab_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read" ON public.vocab_sets FOR SELECT TO authenticated USING (true);

ALTER TABLE public.vocab_set_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read" ON public.vocab_set_items FOR SELECT TO authenticated USING (true);
