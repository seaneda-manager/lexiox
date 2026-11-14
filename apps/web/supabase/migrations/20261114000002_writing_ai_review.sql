-- Writing 학생용 AI 리뷰(상세 설명·모범답안 2종)와 Drill 문항을 캐시하는 jsonb.
-- 수동 적용 필요(Supabase SQL Editor). 컬럼이 없어도 리뷰는 매번 생성되어 동작한다(캐시만 안 됨).
alter table public.writing_2026_sessions
  add column if not exists ai_review jsonb;
