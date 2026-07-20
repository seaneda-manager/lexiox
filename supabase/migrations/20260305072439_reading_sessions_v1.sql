-- supabase/migrations/20260305090000_reading_sessions_v1.sql
-- Reading sessions + answers + review RPCs (v1)

create extension if not exists "pgcrypto";

-- =========================================================
-- 1) reading_sessions
-- =========================================================
create table if not exists public.reading_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- content identity
  set_id text null,
  passage_id uuid null references public.reading_passages(id) on delete set null,

  -- product line info (optional but future-proof)
  product text null,      -- 'toefl' | 'lingox'
  track text null,        -- 'ms' | 'hs' | 'junior' (lingox)
  profile_id text null,   -- runnerProfiles.ts id

  mode text not null default 'test', -- test/exam/practice/drill/review/study

  started_at timestamptz not null default now(),
  finished_at timestamptz null
);

create index if not exists idx_reading_sessions_user on public.reading_sessions(user_id, started_at desc);
create index if not exists idx_reading_sessions_set on public.reading_sessions(set_id);
create index if not exists idx_reading_sessions_passage on public.reading_sessions(passage_id);

alter table public.reading_sessions enable row level security;

drop policy if exists "reading_sessions_select_own" on public.reading_sessions;
create policy "reading_sessions_select_own"
on public.reading_sessions
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "reading_sessions_insert_own" on public.reading_sessions;
create policy "reading_sessions_insert_own"
on public.reading_sessions
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "reading_sessions_update_own" on public.reading_sessions;
create policy "reading_sessions_update_own"
on public.reading_sessions
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- =========================================================
-- 2) reading_session_answers
-- =========================================================
create table if not exists public.reading_session_answers (
  id bigserial primary key,
  session_id uuid not null references public.reading_sessions(id) on delete cascade,
  question_id uuid not null references public.reading_questions(id) on delete cascade,

  -- store as text to support summary multi-select: "uuid|uuid|uuid"
  choice_id text not null,

  elapsed_ms integer null,
  created_at timestamptz not null default now()
);

create index if not exists idx_rsa_session_created on public.reading_session_answers(session_id, created_at desc);
create index if not exists idx_rsa_session_question on public.reading_session_answers(session_id, question_id);

alter table public.reading_session_answers enable row level security;

drop policy if exists "reading_session_answers_select_own" on public.reading_session_answers;
create policy "reading_session_answers_select_own"
on public.reading_session_answers
for select
to authenticated
using (
  exists (
    select 1
    from public.reading_sessions s
    where s.id = reading_session_answers.session_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "reading_session_answers_insert_own" on public.reading_session_answers;
create policy "reading_session_answers_insert_own"
on public.reading_session_answers
for insert
to authenticated
with check (
  exists (
    select 1
    from public.reading_sessions s
    where s.id = reading_session_answers.session_id
      and s.user_id = auth.uid()
  )
);

-- =========================================================
-- 3) correctness evaluator (handles summary with selectionCount)
-- =========================================================
create or replace function public.reading_eval_answer(
  p_question_id uuid,
  p_choice_id text
) returns boolean
language plpgsql
stable
as $$
declare
  qtype text;
  sel_count int;
  ids text[];
  picked_n int;
  correct_n int;
begin
  select
    q.type,
    coalesce((q.meta->'summary'->>'selectionCount')::int, 2)
  into qtype, sel_count
  from public.reading_questions q
  where q.id = p_question_id;

  if qtype is null then
    return false;
  end if;

  if qtype = 'summary' then
    ids := regexp_split_to_array(coalesce(p_choice_id,''), '\|');
    ids := array_remove(ids, '');
    picked_n := array_length(ids, 1);

    if picked_n is null or picked_n <> sel_count then
      return false;
    end if;

    select count(*) into correct_n
    from public.reading_choices c
    where c.question_id = p_question_id
      and c.is_correct = true
      and c.id in (select (x)::uuid from unnest(ids) as x);

    return correct_n = sel_count;
  end if;

  return exists(
    select 1
    from public.reading_choices c
    where c.question_id = p_question_id
      and c.id = (p_choice_id)::uuid
      and c.is_correct = true
  );

exception when others then
  return false;
end;
$$;

-- =========================================================
-- 4) review RPCs (score + rows)
--    - uses latest answer per question (distinct on)
-- =========================================================
drop function if exists public.reading_review_score(uuid);
create function public.reading_review_score(
  session_id uuid
) returns table(total integer, correct integer)
language sql
stable
as $$
with latest as (
  select distinct on (a.question_id)
    a.question_id,
    a.choice_id
  from public.reading_session_answers a
  where a.session_id = reading_review_score.session_id
  order by a.question_id, a.created_at desc
)
select
  count(*)::int as total,
  count(*) filter (where public.reading_eval_answer(q.id, latest.choice_id))::int as correct
from public.reading_questions q
join public.reading_sessions s on s.id = reading_review_score.session_id
left join latest on latest.question_id = q.id
where s.user_id = auth.uid()
  and (s.passage_id is null or q.passage_id = s.passage_id);
$$;

drop function if exists public.reading_review_rows(uuid);
create function public.reading_review_rows(
  session_id uuid
) returns table(
  q_no integer,
  question text,
  user_choice text,
  correct_choice text,
  is_correct boolean
)
language sql
stable
as $$
with s as (
  select *
  from public.reading_sessions
  where id = reading_review_rows.session_id
    and user_id = auth.uid()
),
latest as (
  select distinct on (a.question_id)
    a.question_id,
    a.choice_id
  from public.reading_session_answers a
  where a.session_id = reading_review_rows.session_id
  order by a.question_id, a.created_at desc
),
q as (
  select q.*
  from public.reading_questions q
  join s on (s.passage_id is null or q.passage_id = s.passage_id)
)
select
  q.number::int as q_no,
  q.stem as question,

  -- user_choice
  case
    when position('|' in coalesce(latest.choice_id,'')) > 0 then
      (
        select string_agg(coalesce(c.label, c.text, c.id::text), ' | ' order by c.id::text)
        from public.reading_choices c
        where c.question_id = q.id
          and c.id in (
            select (x)::uuid
            from unnest(regexp_split_to_array(latest.choice_id, '\|')) as x
          )
      )
    else
      (
        select coalesce(c.label, c.text, c.id::text)
        from public.reading_choices c
        where c.id = (latest.choice_id)::uuid
        limit 1
      )
  end as user_choice,

  -- correct_choice
  case
    when q.type = 'summary' then
      (
        select string_agg(coalesce(c.label, c.text, c.id::text), ' | ' order by c.id::text)
        from public.reading_choices c
        where c.question_id = q.id
          and c.is_correct = true
      )
    else
      (
        select coalesce(c.label, c.text, c.id::text)
        from public.reading_choices c
        where c.question_id = q.id
          and c.is_correct = true
        limit 1
      )
  end as correct_choice,

  public.reading_eval_answer(q.id, latest.choice_id) as is_correct
from q
left join latest on latest.question_id = q.id
order by q.number asc;
$$;
