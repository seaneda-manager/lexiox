-- 중학내신 드릴 결과 저장. 학생이 드릴을 풀 때마다(번역/작문/단어확인/단어시험/
-- 단어깜지/문법포인트) 점수+오답 상세를 기록해서 teacher/admin이 확인할 수 있게 한다.
-- 드릴 타입별 "최신 결과"만 유지 (재시도하면 덮어씀) — student_readiness와 같은
-- 단순 현재-상태 모델을 따른다.
create table if not exists public.middle_naesin_drill_results (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid not null references auth.users(id) on delete cascade,
  unit_id        uuid not null references public.middle_naesin_units(id) on delete cascade,
  drill_type     text not null check (drill_type in (
    'translation',
    'composition',
    'vocab_check',
    'vocab_test_en_en',
    'vocab_test_en_to_ko',
    'vocab_test_ko_to_en',
    'vocab_cram',
    'grammar_point'
  )),
  ref_id         text not null default '',  -- grammar_point일 때 해당 포인트 id, 그 외 ''
  score          int not null default 0,
  total          int not null default 0,
  detail         jsonb,                     -- 문항별 정오답+해설 등 상세 (오답 리뷰용)
  attempt_count  int not null default 1,
  completed_at   timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint middle_naesin_drill_results_unique unique (student_id, unit_id, drill_type, ref_id)
);

create index if not exists idx_mn_drill_results_student on public.middle_naesin_drill_results (student_id);
create index if not exists idx_mn_drill_results_unit    on public.middle_naesin_drill_results (unit_id);

alter table public.middle_naesin_drill_results enable row level security;

drop policy if exists "open" on public.middle_naesin_drill_results;
create policy "open" on public.middle_naesin_drill_results for all using (true) with check (true);

drop trigger if exists trg_mn_drill_results_updated_at on public.middle_naesin_drill_results;
create trigger trg_mn_drill_results_updated_at
  before update on public.middle_naesin_drill_results
  for each row execute function public.set_updated_at();
