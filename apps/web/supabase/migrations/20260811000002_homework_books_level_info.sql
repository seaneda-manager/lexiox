-- 교재별 레벨/학년대/이 교재를 마스터했을 때 기대되는 평균 성적 수준.
-- 실제 데이터 기반 예측이 아니라 선생님이 경험적으로 정의해두는 기준표다.
alter table homework_books
  add column if not exists level text,
  add column if not exists recommended_grade text,
  add column if not exists expected_school_grade text,
  add column if not exists expected_mock_exam text;
