-- semantic_tags가 같은 단어들을 word_synonyms에 자동 입력
-- 임시 방안: 게임 테스트용 동의어 데이터 생성

INSERT INTO word_synonyms (word_id, synonym_word_id, tier, relationship_type, similarity_score, source)
SELECT DISTINCT
  w1.id AS word_id,
  w2.id AS synonym_word_id,
  1 AS tier,  -- 모두 tier 1로 설정
  'synonym' AS relationship_type,
  100 AS similarity_score,  -- 100% 유사도
  'semantic_tags_auto' AS source
FROM words w1
JOIN word_semantic_tags wst1 ON w1.id = wst1.word_id
JOIN word_semantic_tags wst2 ON wst1.semantic_tag_id = wst2.semantic_tag_id
JOIN words w2 ON w2.id = wst2.word_id
WHERE
  -- 같은 품사끼리만 매칭
  w1.part_of_speech = w2.part_of_speech
  -- 자기 자신은 제외
  AND w1.id != w2.id
  -- 중복 방지
  AND w1.id < w2.id
ON CONFLICT (word_id, synonym_word_id) DO NOTHING;
