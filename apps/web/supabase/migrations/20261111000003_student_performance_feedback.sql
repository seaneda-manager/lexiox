-- 학생 수행 결과 리포트: 선생님 피드백 (분야 / 상세분야 / 개별 문제 단위)
-- 대상 하나(학생+분야+상세분야+문제)당 코멘트 1개를 두고 선생님이 수정한다.
-- 학생은 본인 피드백만 읽을 수 있다. 쓰기는 서버 API(service role)가 스태프 확인 후 수행한다.

create table if not exists public.student_performance_feedback (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references auth.users(id) on delete cascade,
  author_id    uuid references auth.users(id) on delete set null,
  -- section: reading | listening | speaking | writing | vocab | grammar
  section      text not null,
  -- 상세 분야(문제 유형 등). 분야 전체 코멘트면 빈 문자열.
  subsection   text not null default '',
  -- 개별 문제 키. 분야/상세분야 코멘트면 빈 문자열.
  question_key text not null default '',
  body         text not null check (char_length(body) between 1 and 4000),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (student_id, section, subsection, question_key)
);

create index if not exists student_performance_feedback_student_idx
  on public.student_performance_feedback (student_id, updated_at desc);

alter table public.student_performance_feedback enable row level security;

drop policy if exists "spf_student_read_own" on public.student_performance_feedback;
create policy "spf_student_read_own"
  on public.student_performance_feedback for select
  to authenticated
  using (student_id = auth.uid());

drop policy if exists "spf_staff_all" on public.student_performance_feedback;
create policy "spf_staff_all"
  on public.student_performance_feedback for all
  to authenticated
  using (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.role in ('admin', 'teacher'))
  )
  with check (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.role in ('admin', 'teacher'))
  );

grant select, insert, update, delete on public.student_performance_feedback to authenticated;
grant all on public.student_performance_feedback to service_role;
