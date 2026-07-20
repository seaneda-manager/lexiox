-- writing_2026_sessions에 meta(jsonb) 컬럼 추가 (AI 첨삭 결과 저장용)
alter table public.writing_2026_sessions
  add column if not exists meta jsonb;

-- update 정책 (자신의 세션만 수정 가능)
create policy if not exists "writing_2026_sessions_update_own"
  on public.writing_2026_sessions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
