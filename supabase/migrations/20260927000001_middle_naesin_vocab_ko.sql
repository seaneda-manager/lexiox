-- 중학내신 콘텐츠에 "단어 (한글 뜻)" 타입(vocab_ko) 추가.
-- 기존 vocab_en_en(영영 단어)와 별개로, word: 뜻 형식의 간단한 한글 단어장을 위한 타입.
do $$
declare
  v_conname text;
begin
  select conname into v_conname
  from pg_constraint
  where conrelid = 'public.middle_naesin_contents'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%content_type%';

  if v_conname is not null then
    execute format('alter table public.middle_naesin_contents drop constraint %I', v_conname);
  end if;
end $$;

alter table public.middle_naesin_contents
  add constraint middle_naesin_contents_content_type_check
  check (content_type in (
    'main_text',    -- 교과서 본문
    'dialogue',     -- 대화문
    'more_reading', -- More Reading
    'vocab_en_en',  -- 영영 단어
    'vocab_ko',     -- 단어 (한글 뜻)
    'past_exam'     -- 기출문제 분석
  ));
