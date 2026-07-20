-- supabase/migrations/20260410_backfill_student_tasks_to_activities.sql

begin;

insert into public.student_activities (
  student_id,
  activity_type,
  track,
  section,
  status,
  source_table,
  source_id,
  title,
  description,
  due_at,
  created_at,
  updated_at
)
select
  st.student_id,
  'assignment' as activity_type,

  case
    when (st.payload_json->'spec'->>'track') in ('naesin', 'junior', 'toefl', 'voca')
      then (st.payload_json->'spec'->>'track')
    when st.kind = 'LINGO_VOCAB' then 'voca'
    when st.kind = 'TOEFL' then 'toefl'
    when st.kind = 'NAESIN' then 'naesin'
    when st.kind = 'JUNIOR' then 'junior'
    else 'naesin'
  end as track,

  (st.payload_json->'spec'->>'section') as section,

  case
    when st.status = 'done' then 'done'
    when st.status = 'in_progress' then 'in_progress'
    else 'todo'
  end as status,

  'student_tasks' as source_table,
  st.id::text as source_id,

  st.title,
  st.description,

  coalesce(st.due_at, st.due_date::timestamptz) as due_at,

  st.created_at,
  coalesce(st.updated_at, st.created_at) as updated_at

from public.student_tasks st
where st.student_id is not null
  and not exists (
    select 1
    from public.student_activities sa
    where sa.source_table = 'student_tasks'
      and sa.source_id = st.id::text
  );

commit;
