-- 학생+지문+타입 조합은 유일해야 함 (배정 upsert를 위한 unique constraint)
alter table public.hi_naesin_assignments
  add constraint hi_naesin_assignments_student_passage_type_unique
  unique (student_id, passage_id, assignment_type);
