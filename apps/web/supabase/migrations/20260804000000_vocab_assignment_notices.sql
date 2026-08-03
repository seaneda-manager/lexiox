-- Vocab Assignment Notices
-- Track overdue assignments and notify students/teachers

create table if not exists vocab_assignment_notices (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references academy_students(id),
  teacher_id uuid references auth.users(id),
  assignment_id uuid not null references student_vocab_assignments(id),
  track_id uuid not null,
  day_index integer not null,
  notice_type text not null check (notice_type in ('overdue', 'due_soon')),
  status text not null default 'unread' check (status in ('unread', 'read', 'dismissed')),
  created_at timestamp with time zone not null default now(),
  read_at timestamp with time zone,
  dismissed_at timestamp with time zone,

  unique(assignment_id, notice_type)
);

-- Function to create overdue notices
create or replace function create_overdue_assignment_notices()
returns table (created_count integer) as $$
declare
  v_count integer := 0;
begin
  insert into vocab_assignment_notices (
    student_id, assignment_id, track_id, day_index, notice_type, status
  )
  select
    sva.student_id,
    sva.id,
    sva.track_id,
    sva.day_index,
    'overdue',
    'unread'
  from student_vocab_assignments sva
  where
    sva.completed_at is null
    and sva.available_at < current_date
    and not exists (
      select 1 from vocab_assignment_notices van
      where van.assignment_id = sva.id
      and van.notice_type = 'overdue'
      and van.status = 'unread'
    )
  on conflict (assignment_id, notice_type) do nothing;

  get diagnostics v_count = row_count;
  return query select v_count;
end;
$$ language plpgsql;

-- Index for faster lookups
create index if not exists idx_vocab_assignment_notices_student_id on vocab_assignment_notices(student_id);
create index if not exists idx_vocab_assignment_notices_status on vocab_assignment_notices(status);
create index if not exists idx_vocab_assignment_notices_created_at on vocab_assignment_notices(created_at);
