-- Enhance Jr. Reading Passages
alter table if exists jr_reading_passages
add column if not exists level int default 3,
add column if not exists textbook text,
add column if not exists korean_translation text,
add column if not exists grammar_analysis jsonb default '{}',
add column if not exists vocabulary jsonb default '[]',
add column if not exists questions jsonb default '[]',
add column if not exists textbook_mapping text;

-- Enhance Jr. Grammar Chapters
alter table if exists jr_grammar_chapters
add column if not exists level int default 3,
add column if not exists textbook text,
add column if not exists explanation text,
add column if not exists korean_explanation text,
add column if not exists key_points text,
add column if not exists examples jsonb default '[]',
add column if not exists exercises jsonb default '[]',
add column if not exists textbook_mapping text;

-- Enhance Jr. Listening Sessions (already created in 20260715000001)
alter table if exists jr_listening_sessions
add column if not exists title text,
add column if not exists difficulty text default 'medium',
add column if not exists level int default 3,
add column if not exists textbook text,
add column if not exists listening_type text default 'conversation',
add column if not exists keywords jsonb default '[]';

-- Enhance Jr. Speaking & Writing Tasks
alter table if exists jr_speaking_writing_tasks
add column if not exists title text,
add column if not exists level int default 3,
add column if not exists korean_prompt text,
add column if not exists preparation_time int default 15,
add column if not exists response_time int default 45,
add column if not exists sample_answer text,
add column if not exists sample_answer_korean text,
add column if not exists rubric text,
add column if not exists textbook_mapping text;

-- Create indexes for new tables/columns
create index if not exists idx_jr_reading_passages_level on jr_reading_passages(level);
create index if not exists idx_jr_reading_passages_textbook on jr_reading_passages(textbook);
create index if not exists idx_jr_grammar_chapters_level on jr_grammar_chapters(level);
create index if not exists idx_jr_grammar_chapters_textbook on jr_grammar_chapters(textbook);
create index if not exists idx_jr_listening_sessions_difficulty on jr_listening_sessions(difficulty);
create index if not exists idx_jr_listening_sessions_level on jr_listening_sessions(level);
create index if not exists idx_jr_listening_sessions_type on jr_listening_sessions(listening_type);
create index if not exists idx_jr_speaking_writing_tasks_level on jr_speaking_writing_tasks(level);
create index if not exists idx_jr_speaking_writing_tasks_difficulty on jr_speaking_writing_tasks(difficulty);
