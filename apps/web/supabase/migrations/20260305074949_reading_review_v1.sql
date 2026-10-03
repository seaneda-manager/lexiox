-- supabase/migrations/20260305120000_reading_review_v1.sql
-- 목적:
-- 1) summary multi-select 지원: reading_answers.choice_ids uuid[]
-- 2) upsert 기반 저장을 위한 unique index
-- 3) review RPC 2개 제공: reading_review_score / reading_review_rows

-- 1) summary multi-select 저장용 컬럼 추가 (기존 choice_id uuid는 유지)
alter table public.reading_answers
  add column if not exists choice_ids uuid[];

-- 2) upsert를 위한 유니크 인덱스 (없으면 생성)
create unique index if not exists ux_reading_answers_session_question
  on public.reading_answers (session_id, question_id);

-- 3) RLS (이미 있을 수 있으니, 없으면만 생성)
alter table public.reading_sessions enable row level security;
alter table public.reading_answers enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='reading_sessions' and policyname='reading_sessions_select_own_v1'
  ) then
    execute $p$
      create policy reading_sessions_select_own_v1
      on public.reading_sessions
      for select
      to authenticated
      using (user_id = auth.uid())
    $p$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='reading_sessions' and policyname='reading_sessions_insert_own_v1'
  ) then
    execute $p$
      create policy reading_sessions_insert_own_v1
      on public.reading_sessions
      for insert
      to authenticated
      with check (user_id = auth.uid())
    $p$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='reading_sessions' and policyname='reading_sessions_update_own_v1'
  ) then
    execute $p$
      create policy reading_sessions_update_own_v1
      on public.reading_sessions
      for update
      to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid())
    $p$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='reading_answers' and policyname='reading_answers_select_own_v1'
  ) then
    execute $p$
      create policy reading_answers_select_own_v1
      on public.reading_answers
      for select
      to authenticated
      using (
        exists (
          select 1 from public.reading_sessions s
          where s.id = reading_answers.session_id
            and s.user_id = auth.uid()
        )
      )
    $p$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='reading_answers' and policyname='reading_answers_upsert_own_v1'
  ) then
    execute $p$
      create policy reading_answers_upsert_own_v1
      on public.reading_answers
      for insert
      to authenticated
      with check (
        exists (
          select 1 from public.reading_sessions s
          where s.id = reading_answers.session_id
            and s.user_id = auth.uid()
        )
      )
    $p$;
  end if;
end $$;

-- 4) correctness evaluator (summary 포함)
create or replace function public.reading_eval_answer(
  p_question_id uuid,
  p_choice_id uuid,
  p_choice_ids uuid[]
) returns boolean
language plpgsql
stable
as $$
declare
  qtype text;
  sel_count int;
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
    picked_n := coalesce(array_length(p_choice_ids, 1), 0);
    if picked_n <> sel_count then
      return false;
    end if;

    select count(*) into correct_n
    from public.reading_choices c
    where c.question_id = p_question_id
      and c.is_correct = true
      and c.id = any(p_choice_ids);

    return correct_n = sel_count;
  end if;

  return exists(
    select 1
    from public.reading_choices c
    where c.question_id = p_question_id
      and c.id = p_choice_id
      and c.is_correct = true
  );
end;
$$;

-- 5) review_score RPC
create or replace function public.reading_review_score(
  session_id uuid
) returns table(total integer, correct integer)
language sql
stable
as $$
select
  count(q.id)::int as total,
  count(*) filter (
    where public.reading_eval_answer(q.id, a.choice_id, a.choice_ids)
  )::int as correct
from public.reading_sessions s
join public.reading_questions q
  on q.passage_id = s.passage_id
left join public.reading_answers a
  on a.session_id = s.id
 and a.question_id = q.id
where s.id = reading_review_score.session_id
  and s.user_id = auth.uid();
$$;

-- 6) review_rows RPC
create or replace function public.reading_review_rows(
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
select
  q.number::int as q_no,
  q.stem as question,

  -- user_choice
  case
    when q.type = 'summary' then
      (
        select string_agg(c.text, ' | ' order by c.ord)
        from public.reading_choices c
        where c.question_id = q.id
          and c.id = any(a.choice_ids)
      )
    else
      (
        select c.text
        from public.reading_choices c
        where c.id = a.choice_id
        limit 1
      )
  end as user_choice,

  -- correct_choice
  case
    when q.type = 'summary' then
      (
        select string_agg(c.text, ' | ' order by c.ord)
        from public.reading_choices c
        where c.question_id = q.id
          and c.is_correct = true
      )
    else
      (
        select c.text
        from public.reading_choices c
        where c.question_id = q.id
          and c.is_correct = true
        order by c.ord
        limit 1
      )
  end as correct_choice,

  public.reading_eval_answer(q.id, a.choice_id, a.choice_ids) as is_correct
from public.reading_sessions s
join public.reading_questions q
  on q.passage_id = s.passage_id
left join public.reading_answers a
  on a.session_id = s.id
 and a.question_id = q.id
where s.id = reading_review_rows.session_id
  and s.user_id = auth.uid()
order by q.number asc;
$$;