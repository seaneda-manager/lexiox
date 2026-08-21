-- 중학내신 단원 배정 (하이내신 hi_naesin_assignments 패턴)
-- 학교마다 교과서/내신 범위가 다르므로, 단원 공개(is_published)와 별개로
-- teacher/admin이 학생별로 명시적으로 단원을 배정한다.

create table if not exists public.middle_naesin_assignments (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references auth.users(id) on delete cascade,
  unit_id      uuid not null references public.middle_naesin_units(id) on delete cascade,
  assigned_by  uuid references auth.users(id) on delete set null,
  due_at       timestamptz,
  note         text,
  assigned_at  timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint middle_naesin_assignments_student_unit_unique unique (student_id, unit_id)
);

create index if not exists idx_mn_assignments_student on public.middle_naesin_assignments (student_id);
create index if not exists idx_mn_assignments_unit    on public.middle_naesin_assignments (unit_id);

alter table public.middle_naesin_assignments enable row level security;

drop policy if exists "open" on public.middle_naesin_assignments;
create policy "open" on public.middle_naesin_assignments for all using (true) with check (true);

drop trigger if exists trg_middle_naesin_assignments_updated_at on public.middle_naesin_assignments;
create trigger trg_middle_naesin_assignments_updated_at
  before update on public.middle_naesin_assignments
  for each row execute function public.set_updated_at();
