-- writing_2026_sessions_select_own / _update_own 정책이 auth.uid() = user_id로
-- 제한되어 있어, 관리자가 /admin/writing/grade에서 조회하면 RLS가 학생 제출건을
-- 전부 걸러내 빈 목록으로 보이는 문제를 해결한다.
-- (guardAdmin()/AdminLayout이 이미 profiles.role = 'admin'을 체크하는 것과 동일한
-- 기준으로 SELECT/UPDATE 예외 정책을 추가)

drop policy if exists "writing_2026_sessions_select_admin" on public.writing_2026_sessions;
create policy "writing_2026_sessions_select_admin"
  on public.writing_2026_sessions
  for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

drop policy if exists "writing_2026_sessions_update_admin" on public.writing_2026_sessions;
create policy "writing_2026_sessions_update_admin"
  on public.writing_2026_sessions
  for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );
