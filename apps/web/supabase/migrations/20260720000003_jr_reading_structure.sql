-- Extend jr_reading_passages with detailed content structure
-- Includes: vocabulary, key sentences, jikdok-jihae, comprehension questions

alter table jr_reading_passages add column if not exists vocabulary jsonb default '[]';
-- [{ word, pos, meaning, interpretation_tip, example }, ...]

alter table jr_reading_passages add column if not exists key_sentences jsonb default '[]';
-- [{ 
--   sentence_id, 
--   english, 
--   translation, 
--   sentence_type (단문/중문/복문),
--   conjunction (접속사),
--   structure_analysis { s, v, o, c, modifiers, clauses, phrases },
--   simple_version (단어배열용 평이한 버전)
-- }, ...]

alter table jr_reading_passages add column if not exists jikdok_jihae_base jsonb default '[]';
-- Base direct reading (all students)
-- [{ text, emphasis }, ...]

alter table jr_reading_passages add column if not exists jikdok_jihae_customization jsonb default '{}';
-- Customization rules per weakness type
-- {
--   "adj_clause": "split after relative clause",
--   "adv_phrase": "split before adverb phrase",
--   "time_expr": "separate time expressions",
--   ...
-- }

alter table jr_reading_passages add column if not exists comprehension_questions jsonb default '[]';
-- [{ 
--   type (main_idea/inference/blank_fill/ordering/reference/grammar),
--   question, 
--   options, 
--   correct_answer,
--   explanation
-- }, ...]

alter table jr_reading_passages add column if not exists translation jsonb default '{}';
-- Full passage translation
-- { full_text, by_paragraph }

alter table jr_reading_passages add column if not exists content_metadata jsonb default '{}';
-- { theme, key_grammar_points, learning_objectives, estimated_difficulty }

-- Index for fast lookup
create index if not exists idx_jr_reading_vocabulary on jr_reading_passages using gin(vocabulary);
create index if not exists idx_jr_reading_key_sentences on jr_reading_passages using gin(key_sentences);
