-- Add program field to profiles
-- Values: 'gap' | 'toefl' | 'lingx' | NULL (unassigned / all access)

alter table public.profiles
  add column if not exists program text
  check (program in ('gap', 'toefl', 'lingx'));

comment on column public.profiles.program is
  'Learning program assignment. NULL = unrestricted (legacy / admin / teacher). gap = US college pathway, toefl = Updated TOEFL, lingx = Naesin/Hi-Naesin/Jr/Voca';
