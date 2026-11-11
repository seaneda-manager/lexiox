-- 변형문제 유형 확장 (AI 출제용)
-- 새 유형: grammar_error(어법: 밑줄 5개 중 틀린 것) / awkward_word(어색한 단어) / awkward_sentence(어색한 문장) / idiom_meaning(관용 표현 의미)
--          pronoun_reference(지칭 대상이 다른 대명사) / topic_ko(주제, 한글 보기) / mood_change(분위기 변화)
-- ⚠️ 수동 적용 필요 (Supabase SQL Editor). 기존 데이터에는 영향 없음 — CHECK 제약만 넓힌다.

alter table public.hi_naesin_variant_questions
  drop constraint if exists hi_naesin_variant_questions_question_type_check;

alter table public.hi_naesin_variant_questions
  add constraint hi_naesin_variant_questions_question_type_check
  check (question_type in (
    'text_ordering',
    'blank_word',
    'blank_sentence',
    'irrelevant_sentence',
    'summary_fill',
    'fact',
    'negative_fact',
    'grammar_error',
    'awkward_word',
    'awkward_sentence',
    'idiom_meaning',
    'pronoun_reference',
    'topic_ko',
    'mood_change'
  ));

-- "정답인 이유 고르기" 단계 응답 (정답 제출 후 이유를 한 번 더 고른다)
alter table public.hi_naesin_variant_answers
  add column if not exists reason_choice_index integer,
  add column if not exists reason_is_correct boolean;
