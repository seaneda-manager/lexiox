-- Writing AI 채점 상세 결과(기준별 점수·근거·오류 목록·이중 채점·확인 플래그)와
-- "학생에게 AI 상세 분석 공개" 여부를 담는 jsonb. 수동 적용 필요(Supabase SQL Editor).
alter table public.writing_2026_sessions
  add column if not exists ai_grade_detail jsonb;
