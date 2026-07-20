create table if not exists public.generated_exam_responses (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.generated_exam_assignments(id) on delete cascade,
  student_id    uuid not null references auth.users(id) on delete cascade,
  answers       jsonb not null default '{}',  -- { "1": "③", "2": "①", ... }
  submitted_at  timestamptz,
  created_at    timestamptz not null default now(),
  unique(assignment_id, student_id)
);

alter table public.generated_exam_responses enable row level security;

create policy "student own responses" on public.generated_exam_responses
  for all using (student_id = auth.uid())
  with check (student_id = auth.uid());

-- 선생님: 자기가 배정한 시험의 응답 조회
create policy "teacher view responses" on public.generated_exam_responses
  for select using (
    exists (
      select 1 from public.generated_exam_assignments a
      join public.generated_exams e on e.id = a.exam_id
      where a.id = assignment_id and e.created_by = auth.uid()
    )
  );

create index generated_exam_responses_assignment_id_idx on public.generated_exam_responses(assignment_id);
create index generated_exam_responses_student_id_idx on public.generated_exam_responses(student_id);
