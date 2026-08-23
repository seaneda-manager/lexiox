-- 학생별 통합 캘린더 이벤트 (시험/메이크업/휴가/결석/기타).
-- 지금까지 흩어져 있던 이벤트 소스(naesin_exam_schedule=내신, test_assignments.exam_date=TOEFL,
-- class_days=정규수업 요일 반복) 중 "관리자가 입력할 곳이 아예 없던" 것들(TOEFL 시험일, 메이크업,
-- 휴가/결석)을 여기로 모은다. 기존 naesin_exam_schedule/class_days는 그대로 유지하고 같이 조회한다.
--
-- student_id는 academy_students.id를 참조한다 — 이 마이그레이션과 함께 추가되는
-- /admin/students/[id]/schedule 관리자 화면이 그 id 체계를 쓰기 때문 (다른 sibling 라우트인
-- /admin/students/[id]/exam은 반대로 profiles.id를 쓰는데, 그건 기존 코드라 그대로 둔다 —
-- 새 테이블만이라도 일관되게 가는 게 낫다).

create table if not exists calendar_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references academy_students(id) on delete cascade,
  event_type text not null check (event_type in ('exam', 'makeup', 'vacation', 'absence', 'other')),
  title text not null,
  event_date date not null,
  replaces_date date, -- makeup 전용: 원래 결석한 정규 수업일 (캘린더에서 그 날짜를 취소 표시하는 데 씀)
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_calendar_events_student_date on calendar_events(student_id, event_date);

alter table calendar_events enable row level security;

drop policy if exists "calendar_events_admin_all" on calendar_events;
create policy "calendar_events_admin_all"
  on calendar_events
  for all
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "calendar_events_select_own" on calendar_events;
create policy "calendar_events_select_own"
  on calendar_events
  for select
  using (
    exists (
      select 1 from academy_students
      where academy_students.id = calendar_events.student_id
        and academy_students.auth_user_id = auth.uid()
    )
  );
