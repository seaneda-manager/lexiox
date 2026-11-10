-- 단어 품사/한글 발음 + 학생 집중(탭 이탈) 기록
-- 수동 적용: Supabase SQL 편집기에서 실행

-- 1) words: 한글 발음, 뜻별 품사(뜻을 ';'로 펼친 순서와 1:1)
alter table public.words add column if not exists pronunciation_ko text;
alter table public.words add column if not exists meaning_pos text[];
alter table public.words add column if not exists enriched_at timestamptz;

-- 2) 학생 집중 이벤트 (전체화면 이탈, 탭/창 이탈)
create table if not exists public.student_focus_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  context     text not null,             -- 예: 'vocab-session', 'vocab-test'
  event       text not null,             -- 'tab_hidden' | 'window_blur' | 'fullscreen_exit'
  duration_ms integer,                   -- 돌아왔을 때 이탈 시간
  created_at  timestamptz not null default now()
);

create index if not exists student_focus_events_user_idx
  on public.student_focus_events (user_id, created_at desc);

alter table public.student_focus_events enable row level security;

drop policy if exists "focus events insert own" on public.student_focus_events;
create policy "focus events insert own" on public.student_focus_events
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "focus events read own" on public.student_focus_events;
create policy "focus events read own" on public.student_focus_events
  for select to authenticated using (user_id = auth.uid());
