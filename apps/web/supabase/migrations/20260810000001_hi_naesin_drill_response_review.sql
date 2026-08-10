-- Track whether a teacher has reviewed a wrong Hi-내신 drill answer.
-- Once reviewed, the row drops out of the "오답 검토" queue.
alter table hi_naesin_drill_responses
  add column if not exists reviewed_at timestamp with time zone,
  add column if not exists reviewed_by uuid references auth.users(id);

create index if not exists idx_hi_naesin_drill_responses_unreviewed
  on hi_naesin_drill_responses (created_at)
  where is_correct = false and reviewed_at is null;
