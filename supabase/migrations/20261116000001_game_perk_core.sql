-- =====================================================================
-- Workout 게임 "보상(perk)" 코어 (2단계)
--   게임은 숙제/학원 학습을 끝낸 뒤 쓰는 보상이다. 플레이 양은 시간(분).
--   - game_perk_settings : 적립 규칙(분) — 학원 전체 기본값, 한 줄
--   - academy_study_checks : 선생님의 "학원 학습 완료" 체크
--   - game_perk_ledger : 플레이 시간 장부 (+적립 / -사용)
--
-- ⚠ 수동 적용: Supabase SQL 편집기에서 실행 (주말 적용 합의, 2026-11-15)
--   적용 전/후 확인 쿼리와 되돌리기(rollback) SQL은 맨 아래 주석 참고.
-- =====================================================================

begin;  -- 실패하면 전부 취소(일부만 적용되는 일 없음)

-- ---------------------------------------------------------------------
-- 1) 적립 규칙 (한 줄짜리 설정 테이블)
-- ---------------------------------------------------------------------
create table if not exists public.game_perk_settings (
  id                       integer primary key default 1 check (id = 1),
  homework_minutes         integer not null default 10,  -- 오늘 숙제 전부 완료
  academy_minutes          integer not null default 10,  -- 선생님 "학원 학습 완료" 체크 기본값
  review_bonus_minutes     integer not null default 5,   -- 복습 스테이지 클리어 1회
  review_daily_cap_minutes integer not null default 15,  -- 복습 보너스 하루 상한
  carryover_cap_minutes    integer not null default 0,   -- 미사용 분 이월 상한 (0 = 하루가 지나면 소멸)
  updated_at               timestamptz not null default now()
);

insert into public.game_perk_settings (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 2) 선생님의 학원 학습 완료 체크 (학생·날짜당 1회)
-- ---------------------------------------------------------------------
create table if not exists public.academy_study_checks (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.profiles(id) on delete cascade,
  day           date not null default ((now() at time zone 'Asia/Seoul')::date),
  checked_by    uuid references public.profiles(id) on delete set null,  -- 체크한 선생님(삭제되면 NULL)
  minutes_award integer,           -- 비우면 game_perk_settings.academy_minutes
  note          text,
  created_at    timestamptz not null default now(),
  unique (student_id, day)
);

create index if not exists academy_study_checks_student_day_idx
  on public.academy_study_checks (student_id, day desc);

-- ---------------------------------------------------------------------
-- 3) 플레이 시간 장부 (+적립 / -사용). 쓰기는 서버(서비스 롤)만.
-- ---------------------------------------------------------------------
create table if not exists public.game_perk_ledger (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.profiles(id) on delete cascade,
  day         date not null default ((now() at time zone 'Asia/Seoul')::date),
  minutes     integer not null check (minutes <> 0),   -- + 적립, - 사용/회수
  reason      text not null check (reason in (
                'homework_done',     -- 오늘 숙제 전부 완료
                'academy_checked',   -- 선생님 학원 학습 체크
                'review_stage',      -- 복습 스테이지 클리어 보너스
                'teacher_grant',     -- 선생님이 임의 부여
                'teacher_revoke',    -- 선생님이 회수
                'play_used'          -- 플레이로 사용
              )),
  ref_type    text,                -- 예: 'vocab_assignment' | 'academy_check' | 'stage'
  ref_id      uuid,
  granted_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists game_perk_ledger_student_day_idx
  on public.game_perk_ledger (student_id, day desc);

-- 같은 숙제/체크로 중복 적립되지 않도록(적립 사유별 1회)
create unique index if not exists game_perk_ledger_once_per_ref
  on public.game_perk_ledger (student_id, reason, ref_type, ref_id)
  where ref_id is not null and reason in ('homework_done', 'academy_checked');

-- 학생별·날짜별 잔액 (오늘 놀 수 있는 분 = 적립 합 - 사용 합)
create or replace view public.game_perk_balance as
select student_id, day, sum(minutes)::integer as balance
from public.game_perk_ledger
group by student_id, day;

-- 뷰는 기본적으로 소유자 권한으로 돌아 RLS를 우회한다 → 호출자 권한(security_invoker)으로 돌려
-- 학생이 다른 학생의 잔액을 보지 못하게 하고, 비로그인(anon) 접근은 막는다.
alter view public.game_perk_balance set (security_invoker = true);
revoke all on public.game_perk_balance from anon;

-- ---------------------------------------------------------------------
-- 4) RLS
--    학생: 자기 장부/체크만 읽기. 쓰기는 서버(서비스 롤) 전용 → 학생이 시간을 만들 수 없다.
--    선생님/직원: 전체 읽기, 학원 학습 체크는 쓰기 가능.
-- ---------------------------------------------------------------------
alter table public.game_perk_settings   enable row level security;
alter table public.academy_study_checks enable row level security;
alter table public.game_perk_ledger     enable row level security;

drop policy if exists "perk_settings_read_all" on public.game_perk_settings;
create policy "perk_settings_read_all"
  on public.game_perk_settings for select
  to authenticated using (true);

drop policy if exists "perk_settings_staff_write" on public.game_perk_settings;
create policy "perk_settings_staff_write"
  on public.game_perk_settings for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'hq_staff')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'hq_staff')));

drop policy if exists "study_checks_student_read_own" on public.academy_study_checks;
create policy "study_checks_student_read_own"
  on public.academy_study_checks for select
  using (student_id = auth.uid());

drop policy if exists "study_checks_staff_all" on public.academy_study_checks;
create policy "study_checks_staff_all"
  on public.academy_study_checks for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('teacher', 'admin', 'hq_staff', 'franchisee')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('teacher', 'admin', 'hq_staff', 'franchisee')));

drop policy if exists "perk_ledger_student_read_own" on public.game_perk_ledger;
create policy "perk_ledger_student_read_own"
  on public.game_perk_ledger for select
  using (student_id = auth.uid());

drop policy if exists "perk_ledger_staff_read" on public.game_perk_ledger;
create policy "perk_ledger_staff_read"
  on public.game_perk_ledger for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('teacher', 'admin', 'hq_staff', 'franchisee')));

-- (장부 insert/update/delete 정책은 일부러 만들지 않는다 → 서버 API(서비스 롤)만 기록)

commit;

-- =====================================================================
-- 적용 후 확인 (SQL 편집기에서)
--   select * from public.game_perk_settings;                      -- 1행, 10/10/5/15/0
--   select count(*) from public.game_perk_ledger;                 -- 0
--   select policyname, tablename from pg_policies
--    where tablename in ('game_perk_settings','academy_study_checks','game_perk_ledger');
--
-- 되돌리기 (적용 직후 문제가 있을 때만; 장부 데이터가 사라진다)
--   drop view  if exists public.game_perk_balance;
--   drop table if exists public.game_perk_ledger;
--   drop table if exists public.academy_study_checks;
--   drop table if exists public.game_perk_settings;
-- =====================================================================
