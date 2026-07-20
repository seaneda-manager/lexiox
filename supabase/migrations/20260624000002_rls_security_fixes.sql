-- ============================================================
-- Security fixes round 2
-- 1. Enable RLS on tables with existing policies (policy_exists_rls_disabled)
-- 2. Enable RLS on tables not covered in previous migration
-- 3. Fix SECURITY DEFINER views → SECURITY INVOKER
-- 4. Revoke anon execute from sensitive SECURITY DEFINER functions
-- 5. Fix function search_path mutable warnings
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- 1. Tables with policies but RLS not enabled
-- ──────────────────────────────────────────────────────────
alter table if exists public.student_vocab_assignments enable row level security;
alter table if exists public.student_vocab_breaks      enable row level security;

-- ──────────────────────────────────────────────────────────
-- 2. Additional tables missing RLS
-- ──────────────────────────────────────────────────────────

-- Internal/probe tables: enable RLS with no permissive policy → deny all via API
alter table if exists public.migrations     enable row level security;
alter table if exists public.__jenny_probe  enable row level security;

-- Content tables: read for authenticated
alter table if exists public.vocab_track_sets        enable row level security;
alter table if exists public.vocab_track_day_sets    enable row level security;
alter table if exists public.textbook_lesson_grammar_map enable row level security;
alter table if exists public.passage_grammar_targets enable row level security;
alter table if exists public.grammar_unit_taxonomy   enable row level security;
alter table if exists public.point_rules             enable row level security;

drop policy if exists "vocab_track_sets_read"        on public.vocab_track_sets;
drop policy if exists "vocab_track_day_sets_read"    on public.vocab_track_day_sets;
drop policy if exists "textbook_lesson_grammar_map_read" on public.textbook_lesson_grammar_map;
drop policy if exists "passage_grammar_targets_read" on public.passage_grammar_targets;
drop policy if exists "grammar_unit_taxonomy_read"   on public.grammar_unit_taxonomy;
drop policy if exists "point_rules_read"             on public.point_rules;

create policy "vocab_track_sets_read"        on public.vocab_track_sets        for select to authenticated using (true);
create policy "vocab_track_day_sets_read"    on public.vocab_track_day_sets    for select to authenticated using (true);
create policy "textbook_lesson_grammar_map_read" on public.textbook_lesson_grammar_map for select to authenticated using (true);
create policy "passage_grammar_targets_read" on public.passage_grammar_targets for select to authenticated using (true);
create policy "grammar_unit_taxonomy_read"   on public.grammar_unit_taxonomy   for select to authenticated using (true);
create policy "point_rules_read"             on public.point_rules             for select to authenticated using (true);

-- User-keyed data
alter table if exists public.homework_reminders    enable row level security;
alter table if exists public.lexiox_jr_drill_results enable row level security;

-- homework_reminders: unknown schema — restrict to authenticated for now
drop policy if exists "homework_reminders_auth" on public.homework_reminders;
create policy "homework_reminders_auth" on public.homework_reminders for select to authenticated using (true);

-- lexiox_jr_drill_results: restrict to authenticated for now
drop policy if exists "lexiox_jr_drill_results_auth" on public.lexiox_jr_drill_results;
create policy "lexiox_jr_drill_results_auth" on public.lexiox_jr_drill_results for select to authenticated using (true);

-- ──────────────────────────────────────────────────────────
-- 3. Fix SECURITY DEFINER views → SECURITY INVOKER
--    Postgres 15+ supports ALTER VIEW ... SET (security_invoker = on)
--    This makes the view run with the querying user's permissions, respecting RLS
-- ──────────────────────────────────────────────────────────
do $$
declare
  v text;
  views text[] := array[
    'answers_count_by_passage',
    'v_session_score',
    'student_reading_trends',
    'listening_answer_key',
    'vocab_sets_with_counts',
    'v_vocab_event_weight',
    'v_vocab_weak_score',
    'v_vocab_weak_status',
    'words_with_meaning'
  ];
begin
  foreach v in array views loop
    if exists (
      select 1 from information_schema.views
      where table_schema = 'public' and table_name = v
    ) then
      execute format('alter view public.%I set (security_invoker = on)', v);
    end if;
  end loop;
end $$;

-- ──────────────────────────────────────────────────────────
-- 4. Revoke anon execute from sensitive SECURITY DEFINER functions
-- ──────────────────────────────────────────────────────────

-- award_points should not be callable by anonymous users
revoke execute on function public.award_points(uuid, text, integer, text, jsonb) from anon;

-- is_admin_or_producer should not be callable by anon
do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'is_admin_or_producer'
  ) then
    revoke execute on function public.is_admin_or_producer(uuid) from anon;
  end if;
end $$;

-- ──────────────────────────────────────────────────────────
-- 5. Fix function search_path mutable
--    Add SET search_path = public, pg_catalog to each flagged function
--    using ALTER FUNCTION ... SET search_path
-- ──────────────────────────────────────────────────────────
do $$
declare
  r record;
begin
  -- Fix all public functions that don't already have search_path set
  for r in
    select p.oid::regprocedure::text as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'set_writing_tests_updated_at',
        'is_admin_or_producer',
        'block_profile_privileged_updates',
        'set_speaking_tests_updated_at',
        'inflect_verb_3rd',
        'inflect_verb_past',
        'inflect_verb_ing',
        'en_verb_3rd',
        'en_verb_past_regular',
        'lock_vocab_drill_asset',
        'fill_answer_user_id',
        'record_vocab_drill_attempt_v2',
        'set_updated_at_word_form',
        'upsert_word_form_deriv',
        'derive_verb_forms',
        'upsert_word_form_verb',
        'reading_eval_answer',
        'reading_review_score',
        'reading_review_rows',
        'tg_set_updated_at',
        'set_updated_at',
        'admin_set_role',
        'is_admin',
        'set_timestamp_updated_at',
        'touch_updated_at',
        'is_member',
        'set_claims',
        'show_claims',
        'reset_claims',
        'get_daily_speed_ranking',
        'update_updated_at',
        'set_writing_2026_sessions_updated_at',
        'jwt_role',
        'set_updated_at_answers',
        'make_teacher',
        'calc_level',
        'save_reading_passage_full',
        'get_vocab_weak_status',
        'save_reading_passage_full_with_order',
        'listening_session_score',
        'set_reading_tests_2026_updated_at',
        'set_listening_tests_2026_updated_at'
      )
  loop
    begin
      execute format('alter function %s set search_path = public, pg_catalog', r.sig);
    exception when others then
      -- skip if function can't be altered (e.g. system functions)
      null;
    end;
  end loop;
end $$;
