-- Function to calculate available_at based on student's schedule (weekdays)
-- Example: if start_date='2026-07-21' (Monday) and weekdays=[1,3,5] (Mon, Wed, Fri)
-- then day_index=1 -> 2026-07-21, day_index=2 -> 2026-07-23, day_index=3 -> 2026-07-25, etc.

create or replace function calculate_available_date(
  p_start_date date,
  p_weekdays integer[],
  p_day_index integer
)
returns date as $$
declare
  v_current_date date := p_start_date;
  v_count integer := 0;
  v_dow integer;
begin
  -- Handle edge cases
  if p_day_index < 1 then
    return p_start_date;
  end if;

  if p_weekdays is null or array_length(p_weekdays, 1) is null then
    -- Default: every day if no weekdays specified
    return p_start_date + (p_day_index - 1);
  end if;

  -- Find the p_day_index-th occurrence of a valid weekday
  v_count := 0;
  while v_count < p_day_index loop
    v_dow := extract(isodow from v_current_date)::integer; -- 1=Monday, 7=Sunday

    if v_dow = any(p_weekdays) then
      v_count := v_count + 1;
      if v_count = p_day_index then
        return v_current_date;
      end if;
    end if;

    v_current_date := v_current_date + 1;
  end loop;

  return v_current_date;
end;
$$ language plpgsql immutable;

-- Function to get all available dates for a course
-- Returns array of dates for Day 1, 2, 3, ... total_days
create or replace function get_course_available_dates(
  p_start_date date,
  p_weekdays integer[],
  p_total_days integer
)
returns table (day_index integer, available_at date) as $$
declare
  i integer;
begin
  for i in 1..p_total_days loop
    return query select i, calculate_available_date(p_start_date, p_weekdays, i);
  end loop;
end;
$$ language plpgsql immutable;
