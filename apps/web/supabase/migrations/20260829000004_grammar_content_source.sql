-- AI 문법 콘텐츠 생성/감수 + 관리자 입력
-- source: 'ai'  = AI 생성분 (재생성 시 교체됨)
--         'manual' = 관리자가 만들거나 "유지"로 잠근 것 (재생성 시 보존)

ALTER TABLE grammar_2026_units
  ADD COLUMN IF NOT EXISTS admin_note text;

ALTER TABLE grammar_2026_explanation_segments
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'ai'
    CHECK (source IN ('ai', 'manual'));

ALTER TABLE grammar_2026_drills
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'ai'
    CHECK (source IN ('ai', 'manual'));

COMMENT ON COLUMN grammar_2026_units.admin_note IS '관리자/선생님이 마지막에 넣는 자유기술 메모 (교재 매핑, 강조점 등). AI가 건드리지 않음.';
COMMENT ON COLUMN grammar_2026_explanation_segments.source IS 'ai | manual — manual은 AI 재생성 시 보존';
COMMENT ON COLUMN grammar_2026_drills.source IS 'ai | manual';
