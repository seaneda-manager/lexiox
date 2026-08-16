-- ─────────────────────────────────────────────────────────────
-- Vocab Test Taker: points/hints/streak scoring
-- ─────────────────────────────────────────────────────────────

alter table vocab_test_questions
  add column if not exists hint_level    smallint not null default 0
       check (hint_level between 0 and 2),
  add column if not exists points_earned integer,
  add column if not exists points_max    integer not null default 3,
  add column if not exists streak_before smallint,
  add column if not exists streak_bonus  integer not null default 0,
  add column if not exists answered_at   timestamptz,
  add column if not exists answer_seq    integer;

alter table vocab_test_sessions
  add column if not exists total_points   integer not null default 0,
  add column if not exists max_points     integer,
  add column if not exists current_streak smallint not null default 0,
  add column if not exists best_streak    smallint not null default 0,
  add column if not exists answered_count integer not null default 0,
  add column if not exists hints_used     integer not null default 0;

alter table vocab_test_configs
  add column if not exists hints_enabled  boolean not null default true,
  add column if not exists max_hint_level smallint not null default 2;

-- backfill percentage-era rows so the scoreboard isn't skewed
update vocab_test_sessions
   set total_points = coalesce(correct_count, 0) * 3,
       max_points   = coalesce(total_count, 0) * 3
 where status = 'graded' and total_points = 0;

create index if not exists idx_vts_student_submitted
  on vocab_test_sessions (student_id, submitted_at desc);
create index if not exists idx_vts_graded_submitted
  on vocab_test_sessions (submitted_at desc) where status = 'graded';
