-- profiles 테이블에 tribe 컬럼 추가
alter table public.profiles
  add column if not exists tribe text check (tribe in ('kenine', 'fenine', 'lutrine'));
