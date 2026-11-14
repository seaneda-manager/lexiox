-- 선생님/관리자가 학생의 Reading · Listening · Writing 결과를 읽을 수 있게 한다.
--
-- 문제: 선생님·관리자 화면(학생 현황, 학생 진행 현황, 리뷰 관리)은 로그인한 계정의 권한(RLS)으로 조회하는데,
--   · reading_results_2026  : "학생 본인만" 정책뿐 ("선생님/관리자용 policy는 나중에 추가" 라고 적힌 채 남아 있었음)
--   · listening_results_2026 : "학생 본인만" + service_role 정책뿐
--   · writing_2026_sessions  : 관리자(role = 'admin')만 — 선생님은 안 보임
-- 그래서 DB에는 결과가 있는데 직원 화면에는 빈 목록으로 보였다 (Speaking 은 직원 읽기 정책이 이미 있음).
--
-- 해결: 이미 있는 public.is_staff() (profiles.role in ('admin','teacher')) 를 써서 SELECT 만 허용한다.
-- 쓰기(INSERT/UPDATE/DELETE)는 건드리지 않는다. 수동 적용 필요(Supabase SQL Editor). 여러 번 실행해도 안전하다.

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'teacher')
  );
$$;

-- Reading
drop policy if exists "reading_results_2026_staff_read" on public.reading_results_2026;
create policy "reading_results_2026_staff_read"
  on public.reading_results_2026
  for select
  to authenticated
  using (public.is_staff());

-- Listening
drop policy if exists "listening_results_2026_staff_read" on public.listening_results_2026;
create policy "listening_results_2026_staff_read"
  on public.listening_results_2026
  for select
  to authenticated
  using (public.is_staff());

-- Writing (관리자 정책은 이미 있고, 선생님도 읽을 수 있게 추가)
drop policy if exists "writing_2026_sessions_select_staff" on public.writing_2026_sessions;
create policy "writing_2026_sessions_select_staff"
  on public.writing_2026_sessions
  for select
  to authenticated
  using (public.is_staff());
