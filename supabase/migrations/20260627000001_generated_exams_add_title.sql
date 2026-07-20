alter table generated_exams
  add column if not exists title text not null default '1회';
