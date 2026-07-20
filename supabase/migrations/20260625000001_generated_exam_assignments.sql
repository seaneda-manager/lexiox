create table if not exists public.generated_exam_assignments (
  id           uuid primary key default gen_random_uuid(),
  exam_id      uuid not null references public.generated_exams(id) on delete cascade,
  student_id   uuid not null references auth.users(id) on delete cascade,
  assigned_by  uuid not null references auth.users(id) on delete cascade,
  assigned_at  timestamptz not null default now(),
  due_date     date,
  unique(exam_id, student_id)
);

alter table public.generated_exam_assignments enable row level security;

-- 선생님: 자기가 만든 시험 배정만 가능
create policy "teacher assign own exams" on public.generated_exam_assignments
  for all using (assigned_by = auth.uid())
  with check (assigned_by = auth.uid());

-- 학생: 자기한테 배정된 것만 조회
create policy "student view own assignments" on public.generated_exam_assignments
  for select using (student_id = auth.uid());

create index generated_exam_assignments_exam_id_idx on public.generated_exam_assignments(exam_id);
create index generated_exam_assignments_student_id_idx on public.generated_exam_assignments(student_id);
