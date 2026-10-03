-- ============================================================
-- RLS backfill: enable RLS on all tables that were missing it
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- A. CONTENT TABLES (authenticated users can SELECT)
-- ──────────────────────────────────────────────────────────

alter table if exists public.voca_words         enable row level security;
alter table if exists public.voca_passages       enable row level security;
alter table if exists public.voca_output_tasks   enable row level security;
alter table if exists public.voca_tests          enable row level security;
alter table if exists public.voca_word_sounds    enable row level security;

drop policy if exists "voca_words_read"        on public.voca_words;
drop policy if exists "voca_passages_read"     on public.voca_passages;
drop policy if exists "voca_output_tasks_read" on public.voca_output_tasks;
drop policy if exists "voca_tests_read"        on public.voca_tests;
drop policy if exists "voca_word_sounds_read"  on public.voca_word_sounds;

create policy "voca_words_read"        on public.voca_words        for select to authenticated using (true);
create policy "voca_passages_read"     on public.voca_passages     for select to authenticated using (true);
create policy "voca_output_tasks_read" on public.voca_output_tasks for select to authenticated using (true);
create policy "voca_tests_read"        on public.voca_tests        for select to authenticated using (true);
create policy "voca_word_sounds_read"  on public.voca_word_sounds  for select to authenticated using (true);

-- words / vocabulary reference
alter table if exists public.words              enable row level security;
alter table if exists public.word_grade_bands   enable row level security;
alter table if exists public.word_sources       enable row level security;
alter table if exists public.semantic_tags      enable row level security;
alter table if exists public.word_semantic_tags enable row level security;
alter table if exists public.word_grammar_hints enable row level security;

drop policy if exists "words_read"              on public.words;
drop policy if exists "word_grade_bands_read"   on public.word_grade_bands;
drop policy if exists "word_sources_read"       on public.word_sources;
drop policy if exists "semantic_tags_read"      on public.semantic_tags;
drop policy if exists "word_semantic_tags_read" on public.word_semantic_tags;
drop policy if exists "word_grammar_hints_read" on public.word_grammar_hints;

create policy "words_read"              on public.words              for select to authenticated using (true);
create policy "word_grade_bands_read"   on public.word_grade_bands   for select to authenticated using (true);
create policy "word_sources_read"       on public.word_sources       for select to authenticated using (true);
create policy "semantic_tags_read"      on public.semantic_tags      for select to authenticated using (true);
create policy "word_semantic_tags_read" on public.word_semantic_tags for select to authenticated using (true);
create policy "word_grammar_hints_read" on public.word_grammar_hints for select to authenticated using (true);

-- reading content
alter table if exists public.reading_question_meta enable row level security;
alter table if exists public.reading_test_defs     enable row level security;
alter table if exists public.reading_module_defs   enable row level security;
alter table if exists public.reading_module_items  enable row level security;

drop policy if exists "reading_question_meta_read" on public.reading_question_meta;
drop policy if exists "reading_test_defs_read"     on public.reading_test_defs;
drop policy if exists "reading_module_defs_read"   on public.reading_module_defs;
drop policy if exists "reading_module_items_read"  on public.reading_module_items;

create policy "reading_question_meta_read" on public.reading_question_meta for select to authenticated using (true);
create policy "reading_test_defs_read"     on public.reading_test_defs     for select to authenticated using (true);
create policy "reading_module_defs_read"   on public.reading_module_defs   for select to authenticated using (true);
create policy "reading_module_items_read"  on public.reading_module_items  for select to authenticated using (true);

-- naesin reading content
alter table if exists public.naesin_reading_sets       enable row level security;
alter table if exists public.naesin_reading_passages   enable row level security;
alter table if exists public.naesin_reading_questions  enable row level security;
alter table if exists public.naesin_reading_choices    enable row level security;
alter table if exists public.naesin_reading_evidence   enable row level security;

drop policy if exists "naesin_reading_sets_read"      on public.naesin_reading_sets;
drop policy if exists "naesin_reading_passages_read"  on public.naesin_reading_passages;
drop policy if exists "naesin_reading_questions_read" on public.naesin_reading_questions;
drop policy if exists "naesin_reading_choices_read"   on public.naesin_reading_choices;
drop policy if exists "naesin_reading_evidence_read"  on public.naesin_reading_evidence;

create policy "naesin_reading_sets_read"      on public.naesin_reading_sets      for select to authenticated using (true);
create policy "naesin_reading_passages_read"  on public.naesin_reading_passages  for select to authenticated using (true);
create policy "naesin_reading_questions_read" on public.naesin_reading_questions for select to authenticated using (true);
create policy "naesin_reading_choices_read"   on public.naesin_reading_choices   for select to authenticated using (true);
create policy "naesin_reading_evidence_read"  on public.naesin_reading_evidence  for select to authenticated using (true);

-- naesin platform content
alter table if exists public.contents                enable row level security;
alter table if exists public.naesin_contents         enable row level security;
alter table if exists public.naesin_exam_scopes      enable row level security;
alter table if exists public.naesin_exam_scope_items enable row level security;
alter table if exists public.ui_label_catalog        enable row level security;

drop policy if exists "contents_read"                on public.contents;
drop policy if exists "naesin_contents_read"         on public.naesin_contents;
drop policy if exists "naesin_exam_scopes_read"      on public.naesin_exam_scopes;
drop policy if exists "naesin_exam_scope_items_read" on public.naesin_exam_scope_items;
drop policy if exists "ui_label_catalog_read"        on public.ui_label_catalog;

create policy "contents_read"                on public.contents               for select to authenticated using (true);
create policy "naesin_contents_read"         on public.naesin_contents        for select to authenticated using (true);
create policy "naesin_exam_scopes_read"      on public.naesin_exam_scopes     for select to authenticated using (true);
create policy "naesin_exam_scope_items_read" on public.naesin_exam_scope_items for select to authenticated using (true);
create policy "ui_label_catalog_read"        on public.ui_label_catalog       for select to authenticated using (true);

-- hi-naesin content
alter table if exists public.hi_naesin_passages          enable row level security;
alter table if exists public.hi_naesin_drills            enable row level security;
alter table if exists public.hi_naesin_variant_questions enable row level security;
alter table if exists public.hi_naesin_variant_choices   enable row level security;
alter table if exists public.hi_naesin_passage_sentences enable row level security;

drop policy if exists "hi_naesin_passages_read"          on public.hi_naesin_passages;
drop policy if exists "hi_naesin_drills_read"            on public.hi_naesin_drills;
drop policy if exists "hi_naesin_variant_questions_read" on public.hi_naesin_variant_questions;
drop policy if exists "hi_naesin_variant_choices_read"   on public.hi_naesin_variant_choices;
drop policy if exists "hi_naesin_passage_sentences_read" on public.hi_naesin_passage_sentences;

create policy "hi_naesin_passages_read"          on public.hi_naesin_passages          for select to authenticated using (true);
create policy "hi_naesin_drills_read"            on public.hi_naesin_drills            for select to authenticated using (true);
create policy "hi_naesin_variant_questions_read" on public.hi_naesin_variant_questions for select to authenticated using (true);
create policy "hi_naesin_variant_choices_read"   on public.hi_naesin_variant_choices   for select to authenticated using (true);
create policy "hi_naesin_passage_sentences_read" on public.hi_naesin_passage_sentences for select to authenticated using (true);

-- ──────────────────────────────────────────────────────────
-- B. USER-DATA TABLES WITH user_id
-- ──────────────────────────────────────────────────────────

alter table if exists public.writing_2026_sessions enable row level security;

drop policy if exists "writing_2026_sessions_own_select" on public.writing_2026_sessions;
drop policy if exists "writing_2026_sessions_own_insert" on public.writing_2026_sessions;
drop policy if exists "writing_2026_sessions_own_update" on public.writing_2026_sessions;

create policy "writing_2026_sessions_own_select" on public.writing_2026_sessions for select to authenticated using (auth.uid() = user_id);
create policy "writing_2026_sessions_own_insert" on public.writing_2026_sessions for insert to authenticated with check (auth.uid() = user_id);
create policy "writing_2026_sessions_own_update" on public.writing_2026_sessions for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- reading mvp legacy
alter table if exists public.study_sessions enable row level security;
alter table if exists public.daily_tasks    enable row level security;
alter table if exists public.vocab_items    enable row level security;
alter table if exists public.test_sessions  enable row level security;

drop policy if exists "study_sessions_own_select" on public.study_sessions;
drop policy if exists "study_sessions_own_insert" on public.study_sessions;
drop policy if exists "daily_tasks_own_select"    on public.daily_tasks;
drop policy if exists "daily_tasks_own_insert"    on public.daily_tasks;
drop policy if exists "vocab_items_own_select"    on public.vocab_items;
drop policy if exists "vocab_items_own_insert"    on public.vocab_items;
drop policy if exists "test_sessions_own_select"  on public.test_sessions;
drop policy if exists "test_sessions_own_insert"  on public.test_sessions;

create policy "study_sessions_own_select" on public.study_sessions for select to authenticated using (auth.uid() = user_id);
create policy "study_sessions_own_insert" on public.study_sessions for insert to authenticated with check (auth.uid() = user_id);
-- daily_tasks: actual prod schema unknown; restrict to authenticated only for now
create policy "daily_tasks_auth_select" on public.daily_tasks for select to authenticated using (true);
create policy "daily_tasks_auth_insert" on public.daily_tasks for insert to authenticated with check (true);
-- vocab_items and test_sessions: actual prod schema may differ; restrict to authenticated only
create policy "vocab_items_auth_select"   on public.vocab_items   for select to authenticated using (true);
create policy "vocab_items_auth_insert"   on public.vocab_items   for insert to authenticated with check (true);
create policy "test_sessions_auth_select" on public.test_sessions for select to authenticated using (true);
create policy "test_sessions_auth_insert" on public.test_sessions for insert to authenticated with check (true);

-- voca results
alter table if exists public.voca_results enable row level security;

drop policy if exists "voca_results_own_select" on public.voca_results;
drop policy if exists "voca_results_own_insert" on public.voca_results;
drop policy if exists "voca_results_own_update" on public.voca_results;

create policy "voca_results_own_select" on public.voca_results for select to authenticated using (auth.uid() = user_id);
create policy "voca_results_own_insert" on public.voca_results for insert to authenticated with check (auth.uid() = user_id);
create policy "voca_results_own_update" on public.voca_results for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- word knowledge
alter table if exists public.user_word_knowledge enable row level security;

drop policy if exists "user_word_knowledge_own_select" on public.user_word_knowledge;
drop policy if exists "user_word_knowledge_own_insert" on public.user_word_knowledge;
drop policy if exists "user_word_knowledge_own_update" on public.user_word_knowledge;

create policy "user_word_knowledge_own_select" on public.user_word_knowledge for select to authenticated using (auth.uid() = user_id);
create policy "user_word_knowledge_own_insert" on public.user_word_knowledge for insert to authenticated with check (auth.uid() = user_id);
create policy "user_word_knowledge_own_update" on public.user_word_knowledge for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- vocab exam results
alter table if exists public.vocab_exam_results enable row level security;

drop policy if exists "vocab_exam_results_own_select" on public.vocab_exam_results;
drop policy if exists "vocab_exam_results_own_insert" on public.vocab_exam_results;

create policy "vocab_exam_results_own_select" on public.vocab_exam_results for select to authenticated using (auth.uid() = user_id);
create policy "vocab_exam_results_own_insert" on public.vocab_exam_results for insert to authenticated with check (auth.uid() = user_id);

-- speaking results
alter table if exists public.speaking_results_2026 enable row level security;

drop policy if exists "speaking_results_2026_own_select" on public.speaking_results_2026;
drop policy if exists "speaking_results_2026_own_insert" on public.speaking_results_2026;

create policy "speaking_results_2026_own_select" on public.speaking_results_2026 for select to authenticated using (auth.uid() = user_id);
create policy "speaking_results_2026_own_insert" on public.speaking_results_2026 for insert to authenticated with check (auth.uid() = user_id);

-- reading_attempt_answers: restrict to authenticated (actual prod schema may differ)
alter table if exists public.reading_attempt_answers enable row level security;

drop policy if exists "reading_attempt_answers_own_select" on public.reading_attempt_answers;
drop policy if exists "reading_attempt_answers_own_insert" on public.reading_attempt_answers;

create policy "reading_attempt_answers_auth_select" on public.reading_attempt_answers for select to authenticated using (true);
create policy "reading_attempt_answers_auth_insert" on public.reading_attempt_answers for insert to authenticated with check (true);

-- ──────────────────────────────────────────────────────────
-- C. USER-DATA TABLES WITH student_id
-- ──────────────────────────────────────────────────────────

alter table if exists public.student_naesin_reading_assignments enable row level security;
alter table if exists public.naesin_reading_sessions            enable row level security;
alter table if exists public.naesin_reading_analytics_snapshots enable row level security;

drop policy if exists "student_naesin_assignments_own_select"  on public.student_naesin_reading_assignments;
drop policy if exists "student_naesin_assignments_own_insert"  on public.student_naesin_reading_assignments;
drop policy if exists "naesin_reading_sessions_own_select"     on public.naesin_reading_sessions;
drop policy if exists "naesin_reading_sessions_own_insert"     on public.naesin_reading_sessions;
drop policy if exists "naesin_reading_sessions_own_update"     on public.naesin_reading_sessions;
drop policy if exists "naesin_reading_analytics_own_select"    on public.naesin_reading_analytics_snapshots;
drop policy if exists "naesin_reading_analytics_own_insert"    on public.naesin_reading_analytics_snapshots;

create policy "student_naesin_assignments_own_select" on public.student_naesin_reading_assignments for select to authenticated using (auth.uid() = student_id);
create policy "student_naesin_assignments_own_insert" on public.student_naesin_reading_assignments for insert to authenticated with check (auth.uid() = student_id);

create policy "naesin_reading_sessions_own_select" on public.naesin_reading_sessions for select to authenticated using (auth.uid() = student_id);
create policy "naesin_reading_sessions_own_insert" on public.naesin_reading_sessions for insert to authenticated with check (auth.uid() = student_id);
create policy "naesin_reading_sessions_own_update" on public.naesin_reading_sessions for update to authenticated using (auth.uid() = student_id) with check (auth.uid() = student_id);

create policy "naesin_reading_analytics_own_select" on public.naesin_reading_analytics_snapshots
  for select to authenticated
  using (exists (select 1 from public.naesin_reading_sessions s where s.id = session_id and s.student_id = auth.uid()));
create policy "naesin_reading_analytics_own_insert" on public.naesin_reading_analytics_snapshots
  for insert to authenticated
  with check (exists (select 1 from public.naesin_reading_sessions s where s.id = session_id and s.student_id = auth.uid()));

-- student activities
alter table if exists public.student_activities         enable row level security;
alter table if exists public.student_activity_weak_tags enable row level security;
alter table if exists public.student_prescriptions      enable row level security;

drop policy if exists "student_activities_own_select"        on public.student_activities;
drop policy if exists "student_activities_own_insert"        on public.student_activities;
drop policy if exists "student_activities_own_update"        on public.student_activities;
drop policy if exists "student_activity_weak_tags_own_select" on public.student_activity_weak_tags;
drop policy if exists "student_activity_weak_tags_own_insert" on public.student_activity_weak_tags;
drop policy if exists "student_prescriptions_own_select"     on public.student_prescriptions;
drop policy if exists "student_prescriptions_own_insert"     on public.student_prescriptions;

create policy "student_activities_own_select" on public.student_activities for select to authenticated using (auth.uid() = student_id);
create policy "student_activities_own_insert" on public.student_activities for insert to authenticated with check (auth.uid() = student_id);
create policy "student_activities_own_update" on public.student_activities for update to authenticated using (auth.uid() = student_id) with check (auth.uid() = student_id);

create policy "student_activity_weak_tags_own_select" on public.student_activity_weak_tags for select to authenticated using (auth.uid() = student_id);
create policy "student_activity_weak_tags_own_insert" on public.student_activity_weak_tags for insert to authenticated with check (auth.uid() = student_id);

create policy "student_prescriptions_own_select" on public.student_prescriptions for select to authenticated using (auth.uid() = student_id);
create policy "student_prescriptions_own_insert" on public.student_prescriptions for insert to authenticated with check (auth.uid() = student_id);

-- student-parent links
alter table if exists public.student_parent_links enable row level security;

drop policy if exists "student_parent_links_own_select" on public.student_parent_links;

create policy "student_parent_links_own_select" on public.student_parent_links
  for select to authenticated using (auth.uid() = student_id or auth.uid() = parent_id);

-- hi-naesin user data
alter table if exists public.hi_naesin_assignments enable row level security;
alter table if exists public.hi_naesin_sessions    enable row level security;

drop policy if exists "hi_naesin_assignments_own_select" on public.hi_naesin_assignments;
drop policy if exists "hi_naesin_assignments_own_insert" on public.hi_naesin_assignments;
drop policy if exists "hi_naesin_assignments_own_update" on public.hi_naesin_assignments;
drop policy if exists "hi_naesin_sessions_own_select"    on public.hi_naesin_sessions;
drop policy if exists "hi_naesin_sessions_own_insert"    on public.hi_naesin_sessions;
drop policy if exists "hi_naesin_sessions_own_update"    on public.hi_naesin_sessions;

create policy "hi_naesin_assignments_own_select" on public.hi_naesin_assignments for select to authenticated using (auth.uid() = student_id);
create policy "hi_naesin_assignments_own_insert" on public.hi_naesin_assignments for insert to authenticated with check (auth.uid() = student_id);
create policy "hi_naesin_assignments_own_update" on public.hi_naesin_assignments for update to authenticated using (auth.uid() = student_id) with check (auth.uid() = student_id);

create policy "hi_naesin_sessions_own_select" on public.hi_naesin_sessions for select to authenticated using (auth.uid() = student_id);
create policy "hi_naesin_sessions_own_insert" on public.hi_naesin_sessions for insert to authenticated with check (auth.uid() = student_id);
create policy "hi_naesin_sessions_own_update" on public.hi_naesin_sessions for update to authenticated using (auth.uid() = student_id) with check (auth.uid() = student_id);

-- ──────────────────────────────────────────────────────────
-- D. CHILD TABLES (access via parent session join)
-- ──────────────────────────────────────────────────────────

-- review_items → via study_sessions.user_id
alter table if exists public.review_items enable row level security;

drop policy if exists "review_items_own_select" on public.review_items;
drop policy if exists "review_items_own_insert" on public.review_items;

create policy "review_items_own_select" on public.review_items
  for select to authenticated
  using (exists (select 1 from public.study_sessions s where s.id = session_id and s.user_id = auth.uid()));
create policy "review_items_own_insert" on public.review_items
  for insert to authenticated
  with check (exists (select 1 from public.study_sessions s where s.id = session_id and s.user_id = auth.uid()));

-- naesin_reading_answers → via naesin_reading_sessions.student_id
alter table if exists public.naesin_reading_answers enable row level security;

drop policy if exists "naesin_reading_answers_own_select" on public.naesin_reading_answers;
drop policy if exists "naesin_reading_answers_own_insert" on public.naesin_reading_answers;

create policy "naesin_reading_answers_own_select" on public.naesin_reading_answers
  for select to authenticated
  using (exists (select 1 from public.naesin_reading_sessions s where s.id = session_id and s.student_id = auth.uid()));
create policy "naesin_reading_answers_own_insert" on public.naesin_reading_answers
  for insert to authenticated
  with check (exists (select 1 from public.naesin_reading_sessions s where s.id = session_id and s.student_id = auth.uid()));

-- hi_naesin_drill_responses → via hi_naesin_sessions.student_id
alter table if exists public.hi_naesin_drill_responses enable row level security;

drop policy if exists "hi_naesin_drill_responses_own_select" on public.hi_naesin_drill_responses;
drop policy if exists "hi_naesin_drill_responses_own_insert" on public.hi_naesin_drill_responses;
drop policy if exists "hi_naesin_drill_responses_own_update" on public.hi_naesin_drill_responses;

create policy "hi_naesin_drill_responses_own_select" on public.hi_naesin_drill_responses
  for select to authenticated
  using (exists (select 1 from public.hi_naesin_sessions s where s.id = session_id and s.student_id = auth.uid()));
create policy "hi_naesin_drill_responses_own_insert" on public.hi_naesin_drill_responses
  for insert to authenticated
  with check (exists (select 1 from public.hi_naesin_sessions s where s.id = session_id and s.student_id = auth.uid()));
create policy "hi_naesin_drill_responses_own_update" on public.hi_naesin_drill_responses
  for update to authenticated
  using (exists (select 1 from public.hi_naesin_sessions s where s.id = session_id and s.student_id = auth.uid()))
  with check (exists (select 1 from public.hi_naesin_sessions s where s.id = session_id and s.student_id = auth.uid()));

-- hi_naesin_variant_answers → via hi_naesin_sessions.student_id
alter table if exists public.hi_naesin_variant_answers enable row level security;

drop policy if exists "hi_naesin_variant_answers_own_select" on public.hi_naesin_variant_answers;
drop policy if exists "hi_naesin_variant_answers_own_insert" on public.hi_naesin_variant_answers;
drop policy if exists "hi_naesin_variant_answers_own_update" on public.hi_naesin_variant_answers;

create policy "hi_naesin_variant_answers_own_select" on public.hi_naesin_variant_answers
  for select to authenticated
  using (exists (select 1 from public.hi_naesin_sessions s where s.id = session_id and s.student_id = auth.uid()));
create policy "hi_naesin_variant_answers_own_insert" on public.hi_naesin_variant_answers
  for insert to authenticated
  with check (exists (select 1 from public.hi_naesin_sessions s where s.id = session_id and s.student_id = auth.uid()));
create policy "hi_naesin_variant_answers_own_update" on public.hi_naesin_variant_answers
  for update to authenticated
  using (exists (select 1 from public.hi_naesin_sessions s where s.id = session_id and s.student_id = auth.uid()))
  with check (exists (select 1 from public.hi_naesin_sessions s where s.id = session_id and s.student_id = auth.uid()));

-- ──────────────────────────────────────────────────────────
-- E. TEACHER/ADMIN MANAGED TABLES (authenticated read)
-- ──────────────────────────────────────────────────────────

alter table if exists public.assignments        enable row level security;
alter table if exists public.naesin_assignments enable row level security;

drop policy if exists "assignments_read"        on public.assignments;
drop policy if exists "naesin_assignments_read" on public.naesin_assignments;

create policy "assignments_read"        on public.assignments        for select to authenticated using (true);
create policy "naesin_assignments_read" on public.naesin_assignments for select to authenticated using (true);
