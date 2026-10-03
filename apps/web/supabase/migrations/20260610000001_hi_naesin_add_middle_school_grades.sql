-- Add middle school grades (M1, M2, M3) to hi_naesin_passages grade check constraint

alter table public.hi_naesin_passages
  drop constraint if exists hi_naesin_passages_grade_check;

alter table public.hi_naesin_passages
  add constraint hi_naesin_passages_grade_check
  check (grade in ('M1', 'M2', 'M3', 'H1', 'H2', 'H3'));
