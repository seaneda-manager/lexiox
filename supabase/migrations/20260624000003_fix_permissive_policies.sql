-- ============================================================
-- Fix overly permissive RLS policies (rls_policy_always_true)
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- student_vocab_plans: remove FOR ALL USING (true) → use student_id check
-- ──────────────────────────────────────────────────────────
drop policy if exists "student_vocab_plans_auth_all" on public.student_vocab_plans;

-- Proper policies already exist from fix_student_rls_for_academy_students migration
-- (student_vocab_plans_select_own, update_own) — just remove the overly permissive one

-- ──────────────────────────────────────────────────────────
-- naesin_passages: only admin/teacher role should insert/update
-- ──────────────────────────────────────────────────────────
drop policy if exists "naesin_passages_insert_authenticated" on public.naesin_passages;
drop policy if exists "naesin_passages_update_authenticated" on public.naesin_passages;

create policy "naesin_passages_insert_teacher" on public.naesin_passages
  for insert to authenticated
  with check (public.is_admin_or_producer(auth.uid()));

create policy "naesin_passages_update_teacher" on public.naesin_passages
  for update to authenticated
  using (public.is_admin_or_producer(auth.uid()))
  with check (public.is_admin_or_producer(auth.uid()));

-- ──────────────────────────────────────────────────────────
-- vocab_tracks / vocab_track_days: replace FOR ALL (true) with user_id check
-- Check actual column first; fall back to authenticated-only if no user_id
-- ──────────────────────────────────────────────────────────
do $$
begin
  -- vocab_tracks
  drop policy if exists "tracks_delete_auth"      on public.vocab_tracks;
  drop policy if exists "tracks_update_auth"      on public.vocab_tracks;
  drop policy if exists "tracks_write_auth"       on public.vocab_tracks;
  drop policy if exists "vocab_tracks_auth_all"   on public.vocab_tracks;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'vocab_tracks' and column_name = 'user_id'
  ) then
    execute $q$
      create policy "vocab_tracks_own_all" on public.vocab_tracks
        for all to authenticated
        using (auth.uid() = user_id)
        with check (auth.uid() = user_id)
    $q$;
  else
    execute $q$
      create policy "vocab_tracks_auth_select" on public.vocab_tracks
        for select to authenticated using (true);
      create policy "vocab_tracks_auth_write" on public.vocab_tracks
        for insert to authenticated with check (true);
      create policy "vocab_tracks_auth_update" on public.vocab_tracks
        for update to authenticated using (true) with check (true);
      create policy "vocab_tracks_auth_delete" on public.vocab_tracks
        for delete to authenticated using (true)
    $q$;
  end if;

  -- vocab_track_days
  drop policy if exists "track_days_delete_auth"    on public.vocab_track_days;
  drop policy if exists "track_days_update_auth"    on public.vocab_track_days;
  drop policy if exists "track_days_write_auth"     on public.vocab_track_days;
  drop policy if exists "vocab_track_days_auth_all" on public.vocab_track_days;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'vocab_track_days' and column_name = 'user_id'
  ) then
    execute $q$
      create policy "vocab_track_days_own_all" on public.vocab_track_days
        for all to authenticated
        using (auth.uid() = user_id)
        with check (auth.uid() = user_id)
    $q$;
  else
    execute $q$
      create policy "vocab_track_days_auth_select" on public.vocab_track_days
        for select to authenticated using (true);
      create policy "vocab_track_days_auth_write" on public.vocab_track_days
        for insert to authenticated with check (true);
      create policy "vocab_track_days_auth_update" on public.vocab_track_days
        for update to authenticated using (true) with check (true);
      create policy "vocab_track_days_auth_delete" on public.vocab_track_days
        for delete to authenticated using (true)
    $q$;
  end if;
end $$;
