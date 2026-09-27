-- 중학내신 콘텐츠에 "문법 포인트" 타입(grammar_point) 추가.
-- 챕터당 보통 2개 포인트: 제목 + 영어 설명/규칙(body_text) + 한글 설명(translation_ko)
-- + 간단 퀴즈 원문(extra_data.quizRaw, 앱에서 파싱).
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
    'main_text',     -- 교과서 본문
    'dialogue',      -- 대화문
    'more_reading',  -- More Reading
    'vocab_en_en',   -- 영영 단어
    'vocab_ko',      -- 단어 (한글 뜻)
    'grammar_point', -- 문법 포인트
    'past_exam'      -- 기출문제 분석
  ));
