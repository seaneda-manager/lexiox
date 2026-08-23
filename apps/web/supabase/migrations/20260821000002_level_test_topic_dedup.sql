-- AI 자동생성 문항의 주제 중복(예: toefl 고급/최고급 읽기가 둘 다 Thomas Kuhn 패러다임 이론)을
-- 방지하기 위해 생성 시 짧은 주제 라벨을 같이 저장한다. 다음 생성 시 같은 track+section의
-- 기존 라벨들을 프롬프트에 "피하라"고 넣어서 중복을 줄인다 (완전한 보장은 아니지만 크게 줄임).

alter table level_test_questions
  add column if not exists topic_label text;
