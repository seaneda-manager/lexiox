-- Jr. Reading Passages
create table if not exists jr_reading_passages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  difficulty text not null default 'medium', -- easy, medium, hard
  word_count int,
  vocabulary_level text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Jr. Grammar Chapters
create table if not exists jr_grammar_chapters (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  level text default 'middle', -- middle, high
  topic_area text, -- PP, conditionals, gerunds, etc
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Jr. Listening Audio
create table if not exists jr_listening_audio (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  audio_url text not null,
  audio_transcript text,
  duration_seconds int,
  difficulty text default 'medium', -- easy, medium, hard
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Jr. Speaking & Writing Tasks
create table if not exists jr_speaking_writing_tasks (
  id uuid primary key default gen_random_uuid(),
  task_type text not null, -- speaking, writing, speaking_and_writing
  prompt text not null,
  description text,
  difficulty text default 'medium', -- easy, medium, hard
  due_date timestamp with time zone,
  assigned_to_student_id uuid references academy_students(id),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Indexes
create index if not exists idx_jr_reading_passages_difficulty on jr_reading_passages(difficulty);
create index if not exists idx_jr_grammar_chapters_level on jr_grammar_chapters(level);
create index if not exists idx_jr_listening_audio_difficulty on jr_listening_audio(difficulty);
create index if not exists idx_jr_speaking_writing_tasks_type on jr_speaking_writing_tasks(task_type);

