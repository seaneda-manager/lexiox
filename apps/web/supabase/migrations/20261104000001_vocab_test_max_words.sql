-- 단어 시험 출제 단어 수를 admin/teacher가 임의로 정할 수 있게 한다.
-- NULL = 자동(학습 중 약점 단어: prescreen 모름 + speed 오답 위주)
-- 숫자 = 그 개수만큼 출제 (약점 단어 우선, 모자라면 같은 Day의 다른 단어로 채움)
-- 우선순위: 학생별 > 반별 > 전역

alter table vocab_test_configs
  add column if not exists max_words integer
  check (max_words is null or max_words between 1 and 500);
