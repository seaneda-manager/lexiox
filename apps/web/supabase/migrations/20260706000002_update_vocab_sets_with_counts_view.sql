-- Update vocab_sets_with_counts view to include track_id
-- Simply select all columns from vocab_sets

drop view if exists public.vocab_sets_with_counts;

create view public.vocab_sets_with_counts as
select
  s.id,
  s.title,
  s.description,
  s.grade_band,
  s.level,
  s.source_label,
  s.track_id,
  s.created_at,
  0::integer as word_count,
  0::integer as item_count
from
  public.vocab_sets s;

-- Fix SECURITY INVOKER
alter view public.vocab_sets_with_counts set (security_invoker = on);
