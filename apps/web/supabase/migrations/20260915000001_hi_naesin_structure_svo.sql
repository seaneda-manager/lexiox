-- hi_naesin_drills.drill_type 에 structure_svo (문장 성분 S/V/O/C + 수식어 매칭) 추가

ALTER TABLE hi_naesin_drills DROP CONSTRAINT IF EXISTS hi_naesin_drills_drill_type_check;

ALTER TABLE hi_naesin_drills ADD CONSTRAINT hi_naesin_drills_drill_type_check
  CHECK (drill_type IN (
    'translation','translation_arrange','translation_choice',
    'fill_blank','writing','writing_arrange','summary',
    'grammar_choice','vocab','identify_categorize','structure_svo'
  ));
