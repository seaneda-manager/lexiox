-- Student schedule events (exams, vacations, absences)
-- Automatically shifts assignments when registered

create table if not exists public.student_schedule_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references academy_students(id) on delete cascade,
  event_type text not null check (event_type in ('exam', 'vacation', 'absence', 'other')),
  start_date date not null,
  end_date date not null,
  reason text,
  description text,
  is_applied boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (end_date >= start_date)
);

-- Function to shift assignments after schedule event
create or replace function shift_assignments_by_event(
  p_student_id uuid,
  p_start_date date,
  p_end_date date
)
returns table (
  shifted_count integer,
  affected_tracks text[]
) as $$
declare
  v_event_duration integer;
  v_shifted_count integer := 0;
  v_affected_tracks text[] := array[]::text[];
begin
  -- Calculate number of days to shift
  v_event_duration := (p_end_date - p_start_date)::integer + 1;

  -- Find all assignments that overlap with event period
  -- and shift their available_at by event duration
  with affected_assignments as (
    select
      sva.id,
      sva.track_id,
      svt.title,
      sva.available_at,
      sva.available_at + (v_event_duration || ' days')::interval as new_available_at
    from student_vocab_assignments sva
    join vocab_tracks svt on sva.track_id = svt.id
    where
      sva.student_id = p_student_id
      and sva.available_at >= p_start_date
      and sva.available_at <= p_end_date
      and sva.completed_at is null
  )
  update student_vocab_assignments sva
  set
    available_at = (aa.new_available_at::date),
    updated_at = now()
  from affected_assignments aa
  where sva.id = aa.id;

  get diagnostics v_shifted_count = row_count;

  -- Get unique tracks affected
  select array_agg(distinct title)
  into v_affected_tracks
  from (
    select distinct svt.title
    from student_vocab_assignments sva
    join vocab_tracks svt on sva.track_id = svt.id
    where
      sva.student_id = p_student_id
      and sva.available_at >= p_start_date
      and sva.available_at <= (p_end_date + (v_event_duration || ' days')::interval)
      and sva.completed_at is null
  ) t;

  return query select v_shifted_count, coalesce(v_affected_tracks, array[]::text[]);
end;
$$ language plpgsql;

-- Index for efficient lookups
create index if not exists idx_student_schedule_events_student_id on student_schedule_events(student_id);
create index if not exists idx_student_schedule_events_dates on student_schedule_events(start_date, end_date);
