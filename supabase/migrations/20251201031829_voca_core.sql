-- ============================================================
-- VOCA APP – Core Tables
-- ============================================================

-- 1) voca_words ------------------------------------------------
CREATE TABLE IF NOT EXISTS voca_words (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word        text NOT NULL,
  pos         text NOT NULL,
  meaning_kr  text NOT NULL,
  meaning_en  text NOT NULL,
  examples    jsonb DEFAULT '[]'::jsonb,
  tags        jsonb DEFAULT '[]'::jsonb,
  level       int NOT NULL DEFAULT 5,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 2) voca_passages --------------------------------------------
CREATE TABLE IF NOT EXISTS voca_passages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text,
  text        text NOT NULL,
  level       int NOT NULL DEFAULT 5,
  word_ids    jsonb DEFAULT '[]'::jsonb,
  tags        jsonb DEFAULT '[]'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 3) voca_output_tasks -----------------------------------------
CREATE TABLE IF NOT EXISTS voca_output_tasks (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type                text NOT NULL CHECK (type IN ('speaking', 'writing')),
  title               text,
  prompt              text NOT NULL,
  required_word_ids   jsonb DEFAULT '[]'::jsonb,
  suggested_word_ids  jsonb DEFAULT '[]'::jsonb,
  level               int NOT NULL DEFAULT 5,
  tags                jsonb DEFAULT '[]'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- 4) voca_tests -------------------------------------------------
CREATE TABLE IF NOT EXISTS voca_tests (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label            text NOT NULL,
  description      text DEFAULT '',
  level            int NOT NULL DEFAULT 5,
  word_ids         jsonb DEFAULT '[]'::jsonb,
  passage_ids      jsonb DEFAULT '[]'::jsonb,
  output_task_ids  jsonb DEFAULT '[]'::jsonb,
  config           jsonb DEFAULT '{"mode":"mixed","shuffle":true}'::jsonb,
  tags             jsonb DEFAULT '[]'::jsonb,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- 5) voca_results -----------------------------------------------
CREATE TABLE IF NOT EXISTS voca_results (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id       uuid NOT NULL REFERENCES voca_tests(id) ON DELETE CASCADE,
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  total_items   int NOT NULL DEFAULT 0,
  answers       jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_count int DEFAULT 0,
  raw_score     float DEFAULT NULL,
  finished_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_voca_words_word ON voca_words(word);
CREATE INDEX IF NOT EXISTS idx_voca_words_tags ON voca_words USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_voca_passages_tags ON voca_passages USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_voca_output_tasks_tags ON voca_output_tasks USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_voca_tests_tags ON voca_tests USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_voca_results_test_id ON voca_results(test_id);
CREATE INDEX IF NOT EXISTS idx_voca_results_user_id ON voca_results(user_id);

-- ============================================================
-- END
-- ============================================================
