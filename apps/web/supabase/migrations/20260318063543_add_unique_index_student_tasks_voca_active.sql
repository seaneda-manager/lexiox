-- supabase/migrations/20260318_add_unique_index_student_tasks_voca_active.sql

create unique index if not exists uq_student_tasks_voca_active
on student_tasks (
  student_id,
  kind,
  ((payload_json->'spec'->>'packageId')),
  ((payload_json->'spec'->'chapter'->>'vocabSetId'))
)
where kind = 'LINGO_VOCAB'
  and status in ('todo', 'in_progress');
