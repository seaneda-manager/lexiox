-- 학생: 자기에게 배정된 시험만 조회 가능
create policy "student view assigned exams" on public.generated_exams
  for select using (
    exists (
      select 1 from public.generated_exam_assignments
      where exam_id = id
        and student_id = auth.uid()
    )
  );
