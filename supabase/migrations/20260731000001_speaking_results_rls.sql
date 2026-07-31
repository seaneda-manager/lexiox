-- ============================================================
-- Enable RLS on speaking_results_2026 and add policies
-- ============================================================

-- 1. Enable RLS
alter table if exists public.speaking_results_2026 enable row level security;

-- 2. Drop existing policies (if any)
drop policy if exists "speaking_results_read_admin" on public.speaking_results_2026;
drop policy if exists "speaking_results_read_self" on public.speaking_results_2026;
drop policy if exists "speaking_results_update_self" on public.speaking_results_2026;

-- 3. Allow Admin/Teachers to read all results
create policy "speaking_results_read_admin"
  on public.speaking_results_2026
  for select
  to authenticated
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'teacher', 'staff')
    )
  );

-- 4. Allow students to read their own results
create policy "speaking_results_read_self"
  on public.speaking_results_2026
  for select
  to authenticated
  using (user_id = auth.uid());

-- 5. Allow students to update their own results
create policy "speaking_results_update_self"
  on public.speaking_results_2026
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
