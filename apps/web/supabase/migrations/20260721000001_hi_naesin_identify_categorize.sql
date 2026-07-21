-- hi_naesin_drills.drill_type 에 identify_categorize (구조분석: 청킹·지칭추론·킬포) 추가
-- TS 유니온(HI_NAESIN_DRILL_TYPES)에는 추가했으나 DB CHECK 제약이 막고 있어 보정.

ALTER TABLE hi_naesin_drills DROP CONSTRAINT IF EXISTS hi_naesin_drills_drill_type_check;

ALTER TABLE hi_naesin_drills ADD CONSTRAINT hi_naesin_drills_drill_type_check
  CHECK (drill_type IN (
    'translation','translation_arrange','translation_choice',
    'fill_blank','writing','writing_arrange','summary',
    'grammar_choice','vocab','identify_categorize'
  ));
