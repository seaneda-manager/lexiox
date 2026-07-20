-- Jr. Reading Sessions
create table if not exists jr_reading_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references academy_students(id),
  passage_id text not null,
  passage_content text,
  stage text not null default 'vocabulary', -- vocabulary, grammar, reading, comprehension, discussion
  current_sentence_index int default 0,
  created_at timestamp with time zone default now(),
  completed_at timestamp with time zone,
  updated_at timestamp with time zone default now()
);

-- Jr. Reading Vocabulary Logs (stage: vocabulary)
create table if not exists jr_reading_vocab_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references jr_reading_sessions(id) on delete cascade,
  sentence_index int not null,
  word_id uuid,
  word_text text,
  pos text, -- part of speech
  meaning text,
  interpretation_tip text,
  marked_at timestamp with time zone default now()
);

-- Jr. Reading Grammar Preview Logs (stage: grammar)
create table if not exists jr_reading_grammar_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references jr_reading_sessions(id) on delete cascade,
  sentence_index int not null,
  structure_type text, -- relative_clause, phrase, etc
  structure_text text,
  explanation text,
  completed_at timestamp with time zone
);

-- Jr. Reading Translation Logs (stage: reading)
create table if not exists jr_reading_translation_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references jr_reading_sessions(id) on delete cascade,
  sentence_index int not null,
  thought_unit text,
  direct_translation text,
  interpretation text,
  interpretation_type text, -- 'direct', 'direct_and_interpretation' (for long sentences)
  completed_at timestamp with time zone
);

-- Jr. Reading Comprehension Logs (stage: comprehension)
create table if not exists jr_reading_comprehension_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references jr_reading_sessions(id) on delete cascade,
  problem_id text,
  problem_type text, -- topic, blank_inference, order, vocabulary, grammar
  student_answer text,
  is_correct boolean,
  attempted_at timestamp with time zone,
  is_homework boolean default false
);

-- Jr. Reading Discussion Logs (stage: discussion)
create table if not exists jr_reading_discussion_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references jr_reading_sessions(id) on delete cascade,
  question text,
  written_answer text,
  spoken_answer_url text, -- Audio file URL
  completed_at timestamp with time zone
);

-- Jr. Grammar Sessions
create table if not exists jr_grammar_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references academy_students(id),
  grammar_chapter text,
  stage text not null default 'lesson', -- lesson, practice
  current_question_index int default 0,
  created_at timestamp with time zone default now(),
  completed_at timestamp with time zone,
  updated_at timestamp with time zone default now()
);

-- Jr. Grammar Lesson Logs (stage: lesson)
create table if not exists jr_grammar_lesson_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references jr_grammar_sessions(id) on delete cascade,
  concept_id text,
  concept_name text, -- PP, types of nouns, 비교급, etc
  explanation text,
  fill_in_answer text,
  is_correct boolean,
  repetition_count int default 0, -- 2주 4회 추적
  last_reviewed_at timestamp with time zone
);

-- Jr. Grammar Practice Logs (stage: practice)
create table if not exists jr_grammar_practice_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references jr_grammar_sessions(id) on delete cascade,
  problem_id text,
  student_answer text,
  is_correct boolean,
  points_earned int default 0,
  max_points int default 100,
  hints_used int default 0,
  hint_logs jsonb, -- Array of hints with point costs
  attempted_at timestamp with time zone
);

-- Jr. Listening Sessions
create table if not exists jr_listening_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references academy_students(id),
  audio_id text,
  audio_url text,
  stage text not null default 'notes', -- notes, questions, script_review, re_attempt, shadowing, checkup
  current_question_index int default 0,
  created_at timestamp with time zone default now(),
  completed_at timestamp with time zone,
  updated_at timestamp with time zone default now()
);

-- Jr. Listening Note-Taking Logs
create table if not exists jr_listening_notes_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references jr_listening_sessions(id) on delete cascade,
  note_content text,
  recorded_at timestamp with time zone default now()
);

-- Jr. Listening Question Logs (includes initial and re-attempt)
create table if not exists jr_listening_question_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references jr_listening_sessions(id) on delete cascade,
  problem_id text,
  initial_answer text,
  initial_attempt_at timestamp with time zone,
  initial_correct boolean,
  script_shown boolean default false,
  script_explanation text,
  final_answer text,
  final_attempt_at timestamp with time zone,
  final_correct boolean
);

-- Jr. Listening Shadowing & Multiexpress Logs
create table if not exists jr_listening_shadowing_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references jr_listening_sessions(id) on delete cascade,
  sentence_id text,
  original_sentence text,
  alternative_expressions text[], -- Array of alternative expressions
  student_recording_url text,
  completed_at timestamp with time zone
);

-- Jr. Listening Checkup Logs (Homework)
create table if not exists jr_listening_checkup_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references jr_listening_sessions(id) on delete cascade,
  checkup_content text,
  is_homework boolean default true,
  submitted_at timestamp with time zone
);

-- Jr. Speaking & Writing Submissions
create table if not exists jr_speaking_writing_submissions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references academy_students(id),
  assignment_id text,
  assignment_type text, -- speaking, writing, discussion
  submission_type text not null, -- 'audio', 'text'
  content_url text, -- URL to audio or text file
  text_content text, -- For writing
  submitted_at timestamp with time zone default now(),
  teacher_feedback text,
  feedback_given_at timestamp with time zone,
  is_homework boolean default true
);

-- Indexes
create index if not exists idx_jr_reading_sessions_student on jr_reading_sessions(student_id);
create index if not exists idx_jr_grammar_sessions_student on jr_grammar_sessions(student_id);
create index if not exists idx_jr_listening_sessions_student on jr_listening_sessions(student_id);
create index if not exists idx_jr_speaking_writing_student on jr_speaking_writing_submissions(student_id);

-- RLS Policies
alter table jr_reading_sessions enable row level security;
alter table jr_grammar_sessions enable row level security;
alter table jr_listening_sessions enable row level security;
alter table jr_speaking_writing_submissions enable row level security;

create policy "Students can view their own sessions" on jr_reading_sessions
  for select using (student_id = auth.uid());
create policy "Students can create sessions" on jr_reading_sessions
  for insert with check (student_id = auth.uid());
create policy "Students can update their own sessions" on jr_reading_sessions
  for update using (student_id = auth.uid());

create policy "Students can view their own sessions" on jr_grammar_sessions
  for select using (student_id = auth.uid());
create policy "Students can create sessions" on jr_grammar_sessions
  for insert with check (student_id = auth.uid());
create policy "Students can update their own sessions" on jr_grammar_sessions
  for update using (student_id = auth.uid());

create policy "Students can view their own sessions" on jr_listening_sessions
  for select using (student_id = auth.uid());
create policy "Students can create sessions" on jr_listening_sessions
  for insert with check (student_id = auth.uid());
create policy "Students can update their own sessions" on jr_listening_sessions
  for update using (student_id = auth.uid());

create policy "Students can view their own submissions" on jr_speaking_writing_submissions
  for select using (student_id = auth.uid());
create policy "Students can create submissions" on jr_speaking_writing_submissions
  for insert with check (student_id = auth.uid());
create policy "Students can update their own submissions" on jr_speaking_writing_submissions
  for update using (student_id = auth.uid());
