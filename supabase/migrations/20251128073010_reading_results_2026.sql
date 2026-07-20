-- reading_results_2026: 학생별 Reading 2026 시험 결과 저장

create table if not exists public.reading_results_2026 (
  id uuid primary key default gen_random_uuid(),

  -- 누가 푼 시험인지
  user_id uuid references auth.users (id) on delete set null,

  -- 어떤 시험 셋인지
  -- 현재 public.reading_tests_2026 테이블이 없으므로 FK는 잠시 제거
  test_id uuid,

  -- 시험 이름 (label)
  label text,

  -- 문항 수
  total_questions integer not null,

  -- 시험 끝난 시각
  finished_at timestamptz default now(),

  -- 원시 결과 (문항별 정답/오답, 선택지 등)
  raw_result jsonb not null,

  -- 타임스탬프
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_reading_results_2026_user
  on public.reading_results_2026 (user_id);

create index if not exists idx_reading_results_2026_test
  on public.reading_results_2026 (test_id);

create index if not exists idx_reading_results_2026_finished_at
  on public.reading_results_2026 (finished_at);

-- updated_at 자동 갱신 트리거 (있으면 스킵)
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_reading_results_2026_updated_at'
  ) then
    create trigger set_reading_results_2026_updated_at
    before update on public.reading_results_2026
    for each row
    execute function public.set_updated_at();
  end if;
end;
$$;
