-- ─────────────────────────────────────────────────────────────
-- 단어 복습 시험 (2026-11-04 정책)
--  · Day 학습에서 prescreen "모름" + speed 오답인 단어는 무조건 복습 대상
--  · 복습 1회차(D+1)·2회차(D+2)는 의무, 3회차는 1·2회차에서 틀린 단어만
--  · 총 시험(누적)은 기본 30일마다 (설정으로 변경)
-- 전부 추가(additive) 변경이라 기존 데이터는 건드리지 않는다.
-- ─────────────────────────────────────────────────────────────

-- 1) 복습 항목: 학생 × 단어 하나당 한 행. 복습 결과에 따라 stage 가 올라간다.
create table if not exists vocab_review_items (
  id               uuid primary key default gen_random_uuid(),
  student_id       uuid not null,            -- academy_students.id (vocab_learning_attempts.student_id 와 같은 값)
  word_id          uuid not null,
  track_id         uuid,
  set_id           uuid,
  learned_on       date not null,            -- 이 단어를 약점으로 학습한 날 (KST)
  stage            smallint not null default 1 check (stage between 1 and 3), -- 다음에 볼 복습 회차
  due_on           date not null,            -- 이 날짜 이후부터 복습 대상
  status           text not null default 'open' check (status in ('open', 'graduated', 'lapsed')),
  r1_ok            boolean,
  r2_ok            boolean,
  r3_ok            boolean,
  last_reviewed_on date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (student_id, word_id)
);

create index if not exists idx_vri_student_due
  on vocab_review_items (student_id, status, due_on);
create index if not exists idx_vri_track
  on vocab_review_items (student_id, track_id, status);

-- 서버(service role)만 읽고 쓴다. 학생은 API 를 통해서만 접근.
alter table vocab_review_items enable row level security;

-- 2) 시험 종류 구분: day(Day 시험) / review(복습) / total(총 시험) / teacher(선생님 시험)
alter table vocab_test_sessions
  add column if not exists mode text not null default 'day'
    check (mode in ('day', 'review', 'total', 'teacher'));

update vocab_test_sessions set mode = 'teacher' where exam_id is not null and mode = 'day';

create index if not exists idx_vts_student_mode
  on vocab_test_sessions (student_id, mode, submitted_at desc);

-- 3) 총 시험 간격(일). NULL = 기본값(30일). 전역/반별/학생별 설정 행에 둔다.
alter table vocab_test_configs
  add column if not exists total_exam_interval_days integer
    check (total_exam_interval_days is null or total_exam_interval_days between 7 and 180);

-- 4) 기존 학습 기록 채우기: 최근 3일 안에 학습한 Day 의 약점 단어를 복습 대상으로 등록
--    (각 Day 의 know / speed 단계 가장 최근 시도 기준). 이미 있으면 건드리지 않는다.
with latest as (
  select distinct on (a.student_id, a.set_id, a.stage)
         a.student_id, a.set_id, a.stage, a.wrong_word_ids, a.attempted_at
    from vocab_learning_attempts a
   where a.stage in ('know', 'speed')
     and a.attempted_at >= now() - interval '3 days'
   order by a.student_id, a.set_id, a.stage, a.attempted_at desc
),
weak as (
  select l.student_id,
         l.set_id,
         (w.word_id)::text::uuid as word_id,
         max((l.attempted_at at time zone 'Asia/Seoul')::date) as learned_on
    from latest l
    cross join lateral unnest(l.wrong_word_ids) as w(word_id)
   group by l.student_id, l.set_id, (w.word_id)::text::uuid
)
insert into vocab_review_items (student_id, word_id, track_id, set_id, learned_on, stage, due_on)
select wk.student_id,
       wk.word_id,
       s.track_id,
       wk.set_id,
       wk.learned_on,
       1,
       greatest(wk.learned_on + 1, (now() at time zone 'Asia/Seoul')::date)
  from weak wk
  join vocab_set_items si on si.set_id = wk.set_id and si.word_id = wk.word_id
  left join vocab_sets s on s.id = wk.set_id
on conflict (student_id, word_id) do nothing;
