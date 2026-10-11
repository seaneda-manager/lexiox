-- 중학내신 문장 순서 배열 드릴(본문/대화문/More Reading)의 결과를 저장할 수 있도록
-- drill_type 허용 값에 'sentence_order' 를 추가한다. ref_id 는 "{섹션}:{콘텐츠id 또는 all}".
alter table public.middle_naesin_drill_results
  drop constraint if exists middle_naesin_drill_results_drill_type_check;

alter table public.middle_naesin_drill_results
  add constraint middle_naesin_drill_results_drill_type_check
  check (drill_type in (
    'translation',
    'composition',
    'sentence_order',
    'vocab_check',
    'vocab_test_en_en',
    'vocab_test_en_to_ko',
    'vocab_test_ko_to_en',
    'vocab_cram',
    'grammar_point'
  ));
