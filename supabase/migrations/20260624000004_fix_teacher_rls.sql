-- Add teacher/admin SELECT policies for hi-naesin user data tables.
-- Without these, authenticated teacher accounts saw 0 rows because the only
-- select policies required auth.uid() = student_id.

-- hi_naesin_assignments
drop policy if exists "hi_naesin_assignments_admin_select" on public.hi_naesin_assignments;
create policy "hi_naesin_assignments_admin_select" on public.hi_naesin_assignments
  for select to authenticated
  using (public.is_admin_or_producer(auth.uid()));

-- hi_naesin_sessions
drop policy if exists "hi_naesin_sessions_admin_select" on public.hi_naesin_sessions;
create policy "hi_naesin_sessions_admin_select" on public.hi_naesin_sessions
  for select to authenticated
  using (public.is_admin_or_producer(auth.uid()));

-- hi_naesin_drill_responses
drop policy if exists "hi_naesin_drill_responses_admin_select" on public.hi_naesin_drill_responses;
create policy "hi_naesin_drill_responses_admin_select" on public.hi_naesin_drill_responses
  for select to authenticated
  using (public.is_admin_or_producer(auth.uid()));

-- hi_naesin_variant_answers
drop policy if exists "hi_naesin_variant_answers_admin_select" on public.hi_naesin_variant_answers;
create policy "hi_naesin_variant_answers_admin_select" on public.hi_naesin_variant_answers
  for select to authenticated
  using (public.is_admin_or_producer(auth.uid()));
