-- Enable RLS on reading_results_2026 (안 켜져 있으면 켜고, 켜져 있으면 그대로)
alter table public.reading_results_2026
  enable row level security;

-- 1) 본인 데이터 SELECT 허용
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'reading_results_2026'
      and policyname = 'select_own_reading_results'
  ) then
    create policy select_own_reading_results
      on public.reading_results_2026
      for select
      using (auth.uid() = user_id);
  end if;
end
$$;

-- 2) 본인 데이터 INSERT 허용 (user_id null로 넣는 것도 허용)
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'reading_results_2026'
      and policyname = 'insert_own_reading_results'
  ) then
    create policy insert_own_reading_results
      on public.reading_results_2026
      for insert
      with check (auth.uid() = user_id or user_id is null);
  end if;
end
$$;

-- 3) UPDATE/DELETE는 나중에 필요하면 열기 (지금은 막아둠)
