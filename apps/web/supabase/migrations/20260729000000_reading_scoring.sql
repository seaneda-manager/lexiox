-- 2026-07-29: Reading 점수 계산 시스템 추가

-- 1. reading_questions 테이블에 weight 컬럼 추가 (기본값: 1)
ALTER TABLE reading_questions
ADD COLUMN IF NOT EXISTS weight INTEGER DEFAULT 1;

-- weight 제약 조건: 1 이상 5 이하
ALTER TABLE reading_questions
ADD CONSTRAINT reading_questions_weight_check CHECK (weight >= 1 AND weight <= 5);

-- 2. score_conversion_tables 테이블 생성
-- 각 시험 회차/레벨별 원점수→환산점수 변환표 저장
CREATE TABLE IF NOT EXISTS score_conversion_tables (
  id BIGSERIAL PRIMARY KEY,
  test_id TEXT NOT NULL,
  section TEXT NOT NULL, -- 'reading', 'listening', 'speaking', 'writing'
  raw_score INTEGER NOT NULL, -- 원점수 (0~50)
  scaled_score INTEGER NOT NULL, -- 환산점수 (0~30)
  description TEXT, -- 설명 (예: "2026 July Edition")
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(test_id, section, raw_score),
  CONSTRAINT scaled_score_range CHECK (scaled_score >= 0 AND scaled_score <= 30),
  CONSTRAINT raw_score_range CHECK (raw_score >= 0 AND raw_score <= 50)
);

-- score_conversion_tables 인덱스
CREATE INDEX IF NOT EXISTS score_conversion_tables_test_id_idx
ON score_conversion_tables(test_id, section);

-- 3. 기본 Reading Conversion Table 데이터 (20문항 기준)
-- test_id: 'default', section: 'reading'
INSERT INTO score_conversion_tables (test_id, section, raw_score, scaled_score, description)
VALUES
  ('default', 'reading', 20, 30, 'Default Reading Table'),
  ('default', 'reading', 19, 29, 'Default Reading Table'),
  ('default', 'reading', 18, 28, 'Default Reading Table'),
  ('default', 'reading', 17, 26, 'Default Reading Table'),
  ('default', 'reading', 16, 25, 'Default Reading Table'),
  ('default', 'reading', 15, 23, 'Default Reading Table'),
  ('default', 'reading', 14, 21, 'Default Reading Table'),
  ('default', 'reading', 13, 20, 'Default Reading Table'),
  ('default', 'reading', 12, 18, 'Default Reading Table'),
  ('default', 'reading', 11, 16, 'Default Reading Table'),
  ('default', 'reading', 10, 15, 'Default Reading Table'),
  ('default', 'reading', 9, 13, 'Default Reading Table'),
  ('default', 'reading', 8, 11, 'Default Reading Table'),
  ('default', 'reading', 7, 9, 'Default Reading Table'),
  ('default', 'reading', 6, 7, 'Default Reading Table'),
  ('default', 'reading', 5, 5, 'Default Reading Table'),
  ('default', 'reading', 4, 4, 'Default Reading Table'),
  ('default', 'reading', 3, 3, 'Default Reading Table'),
  ('default', 'reading', 2, 2, 'Default Reading Table'),
  ('default', 'reading', 1, 1, 'Default Reading Table'),
  ('default', 'reading', 0, 0, 'Default Reading Table')
ON CONFLICT DO NOTHING;

-- 4. reading_results_2026 테이블에 점수 관련 컬럼 추가
ALTER TABLE reading_results_2026
ADD COLUMN IF NOT EXISTS raw_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS scaled_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS percentage INTEGER DEFAULT 0;

-- 5. 업데이트 트리거 함수 (자동 타임스�프)
CREATE OR REPLACE FUNCTION update_score_conversion_tables_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 적용
DROP TRIGGER IF EXISTS score_conversion_tables_update_timestamp ON score_conversion_tables;
CREATE TRIGGER score_conversion_tables_update_timestamp
BEFORE UPDATE ON score_conversion_tables
FOR EACH ROW
EXECUTE FUNCTION update_score_conversion_tables_timestamp();

-- 6. 권한 설정 (학생은 조회만, Admin은 관리)
-- GRANT SELECT ON score_conversion_tables TO authenticated;
-- GRANT ALL ON score_conversion_tables TO service_role;
