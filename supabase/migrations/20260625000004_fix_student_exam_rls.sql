-- 기존 정책 제거 후 security definer 함수로 재작성
drop policy if exists "student view assigned exams" on public.generated_exams;

create or replace function public.student_can_view_exam(p_exam_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.generated_exam_assignments
    where exam_id = p_exam_id
      and student_id = auth.uid()
  );
$$;

create policy "student view assigned exams" on public.generated_exams
  for select using (public.student_can_view_exam(id));
