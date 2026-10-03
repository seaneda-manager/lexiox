-- 정답을 텍스트로 저장하는 컬럼 추가
-- answer_key_data: { items: [{ number, answer, hint? }] }
alter table photo_homework
  add column if not exists answer_key_data jsonb;
