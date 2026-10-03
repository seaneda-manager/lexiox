-- reading_results_2026: 학생별 Reading 2026 응시 결과 저장

create table if not exists public.reading_results_2026 (
  id uuid primary key default gen_random_uuid(),

  -- 어떤 시험인지
  test_id text not null,
  label text not null,

  -- 응시자 정보 (optional)
  user_id uuid references auth.users(id) on delete set null,
  student_name text,

  -- 점수/문항수
  total_questions integer not null,
  correct_count integer,
  raw_score numeric,

  -- Stage별 통계 (나중에 쓸 용도로 미리 빼둠)
  stage1_correct integer,
  stage1_total integer,
  stage2_correct integer,
  stage2_total integer,

  -- 답안 & 메타 전체 JSON
  answers jsonb not null,
  meta jsonb,

  finished_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- updated_at 자동 갱신 트리거
create or replace function public.set_timestamp_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_timestamp_updated_at on public.reading_results_2026;

create trigger set_timestamp_updated_at
before update on public.reading_results_2026
for each row execute procedure public.set_timestamp_updated_at();

-- RLS 켜기
alter table public.reading_results_2026 enable row level security;

-- 학생: 본인 결과 insert / select 허용
create policy "Students can insert own reading results"
on public.reading_results_2026
for insert
to authenticated
with check (
  auth.uid() is null
  or user_id is null
  or user_id = auth.uid()
);

create policy "Students can view own reading results"
on public.reading_results_2026
for select
to authenticated
using (user_id = auth.uid());

-- (선생님/관리자용 policy는 나중에 추가)
