-- 연결어 빈칸 드릴 결과 저장용: drill_type 허용 값에 'connector_fill' 추가.
-- (sentence_order 마이그레이션 20261011000001 다음에 적용)
alter table public.middle_naesin_drill_results
  drop constraint if exists middle_naesin_drill_results_drill_type_check;

alter table public.middle_naesin_drill_results
  add constraint middle_naesin_drill_results_drill_type_check
  check (drill_type in (
    'translation',
    'composition',
    'sentence_order',
    'connector_fill',
    'vocab_check',
    'vocab_test_en_en',
    'vocab_test_en_to_ko',
    'vocab_test_ko_to_en',
    'vocab_cram',
    'grammar_point'
  ));
