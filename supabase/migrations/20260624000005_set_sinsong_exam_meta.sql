-- Set exam_year and exam_month for 신송고등학교 passages that are missing them.
-- These are 수능스타트 external book passages assigned to 신송고등학교 for 2026년 1학기 기말.
UPDATE public.hi_naesin_passages
SET exam_year = 2026, exam_month = 7
WHERE school_name = '신송고등학교'
  AND exam_year IS NULL;
