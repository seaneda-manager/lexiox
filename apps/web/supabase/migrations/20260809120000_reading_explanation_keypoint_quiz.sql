-- 필수 확인 팝업 퀴즈(핵심 요지 고르기)용 컬럼 추가.
-- key_point_summary: 정답 보기로 쓸 핵심 근거 한 줄 요약.
-- key_point_distractors: 드롭다운에 같이 섞을 함정 보기 (문항별 맞춤, 2개).
alter table public.reading_question_explanations
  add column if not exists key_point_summary text,
  add column if not exists key_point_distractors jsonb not null default '[]'::jsonb;
