begin;

do $$
declare
  has_user_id boolean;
  has_created_at boolean;
  has_updated_at boolean;
  has_started_at boolean;
  has_completed_at boolean;
  has_meta boolean;
  has_score boolean;
  has_accuracy boolean;

  created_expr text;
  updated_expr text;
  started_expr text;
  completed_expr text;
  track_expr text;
  score_expr text;
  accuracy_expr text;
  status_expr text;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'reading_sessions'
      and column_name = 'user_id'
  ) into has_user_id;

  if not has_user_id then
    raise exception 'reading_sessions.user_id column not found';
  end if;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'reading_sessions'
      and column_name = 'created_at'
  ) into has_created_at;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'reading_sessions'
      and column_name = 'updated_at'
  ) into has_updated_at;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'reading_sessions'
      and column_name = 'started_at'
  ) into has_started_at;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'reading_sessions'
      and column_name = 'completed_at'
  ) into has_completed_at;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'reading_sessions'
      and column_name = 'meta'
  ) into has_meta;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'reading_sessions'
      and column_name = 'score'
  ) into has_score;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'reading_sessions'
      and column_name = 'accuracy'
  ) into has_accuracy;

  created_expr :=
    case when has_created_at then 'rs.created_at' else 'now()' end;

  updated_expr :=
    case
      when has_updated_at and has_created_at then 'coalesce(rs.updated_at, rs.created_at)'
      when has_updated_at then 'coalesce(rs.updated_at, now())'
      when has_created_at then 'rs.created_at'
      else 'now()'
    end;

  started_expr :=
    case
      when has_started_at then 'rs.started_at'
      when has_created_at then 'rs.created_at'
      else 'null::timestamptz'
    end;

  completed_expr :=
    case
      when has_completed_at then 'rs.completed_at'
      else 'null::timestamptz'
    end;

  track_expr :=
    case
      when has_meta then 'coalesce(rs.meta->>''track'', ''naesin'')'
      else '''naesin'''
    end;

  score_expr :=
    case when has_score then 'rs.score::numeric' else 'null::numeric' end;

  accuracy_expr :=
    case when has_accuracy then 'rs.accuracy::numeric' else 'null::numeric' end;

  status_expr :=
    case
      when has_completed_at and has_started_at then
        'case when rs.completed_at is not null then ''done''
              when rs.started_at is not null then ''in_progress''
              else ''todo'' end'
      when has_completed_at then
        'case when rs.completed_at is not null then ''done''
              else ''todo'' end'
      when has_started_at then
        'case when rs.started_at is not null then ''in_progress''
              else ''todo'' end'
      else '''done'''
    end;

  execute format(
    $sql$
      insert into public.student_activities (
        student_id,
        activity_type,
        track,
        section,
        status,
        source_table,
        source_id,
        title,
        description,
        score,
        accuracy,
        started_at,
        completed_at,
        created_at,
        updated_at
      )
      select
        rs.user_id,
        'reading_session',
        %s,
        'reading',
        %s,
        'reading_sessions',
        rs.id::text,
        'Reading Session',
        null,
        %s,
        %s,
        %s,
        %s,
        %s,
        %s
      from public.reading_sessions rs
      where rs.user_id is not null
        and not exists (
          select 1
          from public.student_activities sa
          where sa.source_table = 'reading_sessions'
            and sa.source_id = rs.id::text
        )
    $sql$,
    track_expr,
    status_expr,
    score_expr,
    accuracy_expr,
    started_expr,
    completed_expr,
    created_expr,
    updated_expr
  );
end $$;

commit;
