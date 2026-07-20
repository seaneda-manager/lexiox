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

-- Create/Enhance Jr. Listening Sessions
create table if not exists jr_listening_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  audio_url text not null,
  audio_transcript text,
  korean_transcript text,
  difficulty text not null default 'medium',
  level int default 3,
  textbook text,
  listening_type text default 'conversation',
  keywords jsonb default '[]',
  questions jsonb default '[]',
  textbook_mapping text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

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
