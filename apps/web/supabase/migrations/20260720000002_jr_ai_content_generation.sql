-- Add AI Content Generation fields to Jr. Reading Passages
alter table if exists jr_reading_passages
add column if not exists content jsonb default '{}',
add column if not exists status text default 'PUBLISHED',
add column if not exists ai_score numeric default 0,
add column if not exists ai_review jsonb default '{}',
add column if not exists source_textbook text,
add column if not exists source_page int;

-- Add AI Content Generation fields to Jr. Grammar Chapters
alter table if exists jr_grammar_chapters
add column if not exists content jsonb default '{}',
add column if not exists status text default 'PUBLISHED',
add column if not exists ai_score numeric default 0,
add column if not exists ai_review jsonb default '{}',
add column if not exists source_textbook text,
add column if not exists source_page int;

-- Add AI Content Generation fields to Jr. Listening Sessions
alter table if exists jr_listening_sessions
add column if not exists content jsonb default '{}',
add column if not exists status text default 'PUBLISHED',
add column if not exists ai_score numeric default 0,
add column if not exists ai_review jsonb default '{}',
add column if not exists source_textbook text,
add column if not exists source_page int;

-- Add AI Content Generation fields to Jr. Speaking & Writing Tasks
alter table if exists jr_speaking_writing_tasks
add column if not exists content jsonb default '{}',
add column if not exists status text default 'PUBLISHED',
add column if not exists ai_score numeric default 0,
add column if not exists ai_review jsonb default '{}',
add column if not exists source_textbook text,
add column if not exists source_page int;

-- Create indexes for AI review status
create index if not exists idx_jr_reading_passages_status on jr_reading_passages(status);
create index if not exists idx_jr_reading_passages_ai_score on jr_reading_passages(ai_score);
create index if not exists idx_jr_grammar_chapters_status on jr_grammar_chapters(status);
create index if not exists idx_jr_grammar_chapters_ai_score on jr_grammar_chapters(ai_score);
create index if not exists idx_jr_listening_sessions_status on jr_listening_sessions(status);
create index if not exists idx_jr_listening_sessions_ai_score on jr_listening_sessions(ai_score);
create index if not exists idx_jr_speaking_writing_tasks_status on jr_speaking_writing_tasks(status);
create index if not exists idx_jr_speaking_writing_tasks_ai_score on jr_speaking_writing_tasks(ai_score);
