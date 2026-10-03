# Phase B 결과 (루트 103개 적용 여부 정밀 대조)

분류: OK=검사 가능한 객체가 모두 운영에 있음 / OK_DATA=객체는 있으나 INSERT·UPDATE·DELETE 포함(사람 확인) / UNKNOWN=검사 가능한 객체 없음(정책·인덱스·권한 등만) / FAIL=운영에 없는 객체 있음


## FAIL (2)

- 20260626000003_toefl_practice_content.sql  [검사 4개, 미검증: policy:2 index:2]
    ✗ table toefl_practice_passages — 운영에 없음
    ✗ table toefl_practice_questions — 운영에 없음
    ✗ policy read published passages@toefl_practice_passages — 정책 없음
    ✗ policy read questions of published@toefl_practice_questions — 정책 없음
- 20260722103000_add_default_vocab_book.sql  [검사 2개, 미검증: index:1]
    ✗ column academy_students.default_vocab_book_id — 컬럼 없음
    ✗ index idx_academy_students_default_vocab_book — 인덱스 없음

## DRIFT (10)

- 20251120095714_reading_mvp_core.sql  [검사 11개, 미검증: index:6]
    ✗ index idx_daily_tasks_user_id — 인덱스 없음
    ✗ index idx_test_sessions_user_id — 인덱스 없음
- 20251130015228_reading_results_2026.sql  [검사 5개, 미검증: policy:2 trigger:1 drop:1]
    ✗ policy Students can insert own reading results@reading_results_2026 — 정책 없음
    ✗ policy Students can view own reading results@reading_results_2026 — 정책 없음
- 20251130064815_reading_results_2026_policies.sql  [검사 2개, 미검증: policy:2]
    ✗ policy select_own_reading_results@reading_results_2026 — 정책 없음
    ✗ policy insert_own_reading_results@reading_results_2026 — 정책 없음
- 20260302145140_updated_toefl_reading_v1.sql  [검사 24개, 미검증: index:10]
    ✗ index idx_reading_passages_task_type — 인덱스 없음
    ✗ index idx_reading_questions_passage_id — 인덱스 없음
    ✗ index idx_reading_questions_task_type — 인덱스 없음
    ✗ index idx_reading_questions_subtype — 인덱스 없음
    ✗ index idx_reading_attempts_user — 인덱스 없음
    ✗ index idx_reading_attempts_test — 인덱스 없음
- 20260611000003_avatar_storage.sql  [검사 4개, 미검증: policy:4 insert:1 storage:9 drop:4]
    ✗ policy avatar_upload@storage — 정책 없음
    ✗ policy avatar_update@storage — 정책 없음
    ✗ policy avatar_delete@storage — 정책 없음
- 20260618000001_speaking_assets_bucket.sql  [검사 4개, 미검증: policy:4 insert:1 storage:5]
    ✗ policy admin upload speaking assets@storage — 정책 없음
    ✗ policy admin update speaking assets@storage — 정책 없음
    ✗ policy admin delete speaking assets@storage — 정책 없음
- 20260624000003_fix_permissive_policies.sql  [검사 12개, 미검증: policy:12 drop:11]
    ✗ policy vocab_tracks_own_all@vocab_tracks — 정책 없음
    ✗ policy vocab_track_days_own_all@vocab_track_days — 정책 없음
- 20260725000001_listening_2026_tables.sql  [검사 15개, 미검증: policy:7 index:4]
    ✗ policy Public tests readable by authenticated users@listening_tests — 정책 없음
    ✗ policy Users can view their own sessions@listening_sessions — 정책 없음
    ✗ policy Users can create their own sessions@listening_sessions — 정책 없음
    ✗ policy Users can view their own answers@listening_answers — 정책 없음
    ✗ policy Users can insert answers for their sessions@listening_answers — 정책 없음
    ✗ policy Users can view their own results@listening_results — 정책 없음
    ✗ policy Users can insert results for their sessions@listening_results — 정책 없음
    ✗ index idx_listening_sessions_user_id — 인덱스 없음
    ✗ index idx_listening_sessions_test_id — 인덱스 없음
    ✗ index idx_listening_answers_session_id — 인덱스 없음
    ✗ index idx_listening_results_session_id — 인덱스 없음
- 20260731000001_speaking_results_rls.sql  [검사 3개, 미검증: policy:3 drop:3]
    ✗ policy speaking_results_read_admin@speaking_results_2026 — 정책 없음
    ✗ policy speaking_results_read_self@speaking_results_2026 — 정책 없음
    ✗ policy speaking_results_update_self@speaking_results_2026 — 정책 없음
- 20260731000002_add_audio_url_to_speaking_results.sql  [검사 2개, 미검증: index:1]
    ✗ index idx_speaking_results_2026_audio_url — 인덱스 없음

## OK_DATA (5)

- 20250918064430_create_listening_sessions.sql  [검사 8개, 미검증: policy:3 update:1 grant:1 drop:3]
- 20251009090227_fix_listening_plays.sql  [검사 10개, 미검증: trigger:2 update:2 grant:2 drop:2]
- 20260318075008_expand_assignments_columns_v1.sql  [검사 7개, 미검증: update:1]
- 20260331115857_grammar_unit_taxonomy_unit01_seed.sql  [검사 7개, 미검증: insert:1]
- 20260613000010_reading_tests_2026_table.sql  [검사 6개, 미검증: policy:2 index:1 trigger:1 insert:1 drop:1]

## UNKNOWN (12)

- 20250902093750_remote_baseline.sql  [검사 0개]
- 20250902094618_remote_baseline.sql  [검사 0개]
- 20251009072735_reading_sessions_answers.sql  [검사 0개]
- 20251117070323_reading_adaptive.sql  [검사 0개]
- 20251119141524_xxx.sql  [검사 0개]
- 20260312013334_naesin_review_logs_and_analysis_v1.sql  [검사 0개]
- 20260410001544_backfill_student_tasks_to_activities.sql  [검사 0개, 미검증: insert:1]
- 20260410002615_backfill_reading_sessions_to_activities.sql  [검사 0개, 미검증: insert:1]
- 20260624000005_set_sinsong_exam_meta.sql  [검사 0개, 미검증: update:1]
- 20260626000002_toefl_seed_chapters.sql  [검사 0개, 미검증: insert:4]
- 20260703010926_shadowing_point_rule.sql  [검사 0개, 미검증: insert:1]
- 20260722_disable_rls_vocab_set_items.sql  [검사 0개]

## OK (74)

- 20251117104357_create_v_user_listening_sets.sql  [검사 1개]
- 20251119124203_writing_2026_core.sql  [검사 2개, 미검증: index:1]
- 20251128073010_reading_results_2026.sql  [검사 6개, 미검증: index:3 trigger:1]
- 20251201031829_voca_core.sql  [검사 12개, 미검증: index:7]
- 20251201043140_voca_word_sounds.sql  [검사 3개, 미검증: index:2]
- 20251201055309_vocab_core_schema_v1.sql  [검사 4개]
- 20251201060554_vocab_core_step1.sql  [검사 16개, 미검증: index:6]
- 20251202114147_vocab_exam_results.sql  [검사 1개]
- 20251203054137_speaking_voca_drill_results.sql  [검사 1개]
- 20251203060504_speaking_results_2026.sql  [검사 3개, 미검증: index:2]
- 20260304024454_updated_toefl_reading_v1_fix_missing.sql  [검사 15개, 미검증: index:4]
- 20260305072439_reading_sessions_v1.sql  [검사 15개, 미검증: policy:5 index:5 drop:5]
- 20260305073206_reading_sessions_answers_wireup.sql  [검사 24개, 미검증: policy:5 index:5]
- 20260305074949_reading_review_v1.sql  [검사 10개, 미검증: policy:5 index:1]
- 20260305080422_reading_answers_summary_rpc.sql  [검사 5개, 미검증: index:1]
- 20260309065504_reading_review_rpc.sql  [검사 5개, 미검증: index:1]
- 20260311061835_naesin_reading_v1.sql  [검사 50개, 미검증: index:20 trigger:9 drop:9]
- 20260312065631_naesin_platform_draft.sql  [검사 28개, 미검증: index:10]
- 20260312091420_ui_label_catalog_v1.sql  [검사 5개, 미검증: index:4]
- 20260312231504_naesin_content_scope_assignment_v1.sql  [검사 15개, 미검증: index:11]
- 20260313044358_create_naesin_exam_scope_items.sql  [검사 11개, 미검증: index:3]
- 20260318063543_add_unique_index_student_tasks_voca_active.sql  [검사 1개, 미검증: index:1]
- 20260318233229_fix_student_rls_for_academy_students.sql  [검사 8개, 미검증: policy:7 grant:1 drop:7]
- 20260410000622_create_student_activity_sync_core.sql  [검사 22개, 미검증: index:16 trigger:2 drop:2]
- 20260528000001_hi_naesin_schema_v1.sql  [검사 27개, 미검증: index:17 trigger:1 drop:1]
- 20260528000002_hi_naesin_sentences.sql  [검사 3개, 미검증: index:1 trigger:1 drop:1]
- 20260529000001_hi_naesin_drill_vocab_and_response_v1.sql  [검사 3개, 미검증: drop:1]
- 20260601000001_hi_naesin_assignments_unique.sql  [검사 1개]
- 20260601000002_profiles_program_column.sql  [검사 1개]
- 20260601000003_photo_homework.sql  [검사 6개, 미검증: policy:4 drop:4]
- 20260601000004_photo_homework_answer_key_data.sql  [검사 1개]
- 20260601000005_naesin_exam_schedule.sql  [검사 4개, 미검증: policy:2 index:1 drop:2]
- 20260603000001_grammar_2026_core.sql  [검사 15개, 미검증: policy:6 index:4 drop:6]
- 20260603000002_grammar_2026_unit_completions.sql  [검사 4개, 미검증: policy:2 index:1 drop:2]
- 20260610000001_hi_naesin_add_middle_school_grades.sql  [검사 1개, 미검증: drop:1]
- 20260610000002_middle_naesin_schema.sql  [검사 11개, 미검증: policy:2 index:4 trigger:2 drop:4]
- 20260613000001_hi_naesin_enabled_drill_types.sql  [검사 1개]
- 20260613000020_reading_tests_2026_lock.sql  [검사 1개]
- 20260613000030_listening_tests_2026.sql  [검사 6개, 미검증: policy:2 index:1 trigger:1 drop:1]
- 20260613000040_writing_tests.sql  [검사 5개, 미검증: policy:2 trigger:1 drop:3]
- 20260613000050_speaking_tests.sql  [검사 5개, 미검증: policy:2 trigger:1 drop:3]
- 20260615000001_speaking_grading_v1.sql  [검사 16개, 미검증: index:1]
- 20260615000002_writing_grading_v1.sql  [검사 13개, 미검증: index:1]
- 20260618000002_test_assignments.sql  [검사 8개, 미검증: policy:3 index:3 drop:3]
- 20260623000001_generated_exams.sql  [검사 5개, 미검증: policy:3 index:1]
- 20260624000001_rls_backfill.sql  [검사 86개, 미검증: policy:86 drop:86]
- 20260624000002_rls_security_fixes.sql  [검사 8개, 미검증: policy:8 drop:8]
- 20260624000004_fix_teacher_rls.sql  [검사 4개, 미검증: policy:4 drop:4]
- 20260625000001_generated_exam_assignments.sql  [검사 5개, 미검증: policy:2 index:2]
- 20260625000002_generated_exam_responses.sql  [검사 5개, 미검증: policy:2 index:2]
- 20260625000003_generated_exams_student_rls.sql  [검사 1개, 미검증: policy:1]
- 20260625000004_fix_student_exam_rls.sql  [검사 2개, 미검증: policy:1 drop:1]
- 20260625000005_hi_naesin_admin_write.sql  [검사 5개, 미검증: policy:5]
- 20260626000001_toefl_curriculum.sql  [검사 19개, 미검증: policy:10 index:2]
- 20260627000001_generated_exams_add_title.sql  [검사 1개]
- 20260702000001_hi_naesin_drill_layers.sql  [검사 2개, 미검증: drop:1]
- 20260702000002_naesin_sessions.sql  [검사 9개, 미검증: policy:4 index:3 trigger:1 drop:5]
- 20260706000001_add_track_id_to_vocab_sets.sql  [검사 2개, 미검증: index:1]
- 20260706000002_update_vocab_sets_with_counts_view.sql  [검사 1개]
- 20260713000001_vocab_student_plans.sql  [검사 8개, 미검증: index:6]
- 20260714000001_vocab_course_model.sql  [검사 3개, 미검증: index:1]
- 20260714000002_vocab_learning_attempts.sql  [검사 4개, 미검증: index:3 grant:2]
- 20260714000003_vocab_student_goals.sql  [검사 6개, 미검증: policy:3 index:2 grant:2]
- 20260714000004_teacher_warnings.sql  [검사 7개, 미검증: policy:3 index:3 grant:2]
- 20260718000005_add_vocab_homework.sql  [검사 11개, 미검증: index:8]
- 20260722_create_student_progress.sql  [검사 4개, 미검증: index:3]
- 20260808000001_create_ai_usage_logs.sql  [검사 3개, 미검증: index:2]
- 20260809120000_reading_explanation_keypoint_quiz.sql  [검사 2개]
- 20260809130000_listening_results_review_notes.sql  [검사 1개]
- 20260820000001_add_session_state_to_vocab_assignments.sql  [검사 1개]
- 20260821000001_middle_naesin_assignments.sql  [검사 5개, 미검증: policy:1 index:2 trigger:1 drop:2]
- 20260927000001_middle_naesin_vocab_ko.sql  [검사 1개, 미검증: drop:1]
- 20260927000002_middle_naesin_grammar_point.sql  [검사 1개, 미검증: drop:1]
- 20260928000001_middle_naesin_drill_results.sql  [검사 5개, 미검증: policy:1 index:2 trigger:1 drop:2]