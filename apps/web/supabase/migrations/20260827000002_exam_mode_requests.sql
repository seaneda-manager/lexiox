-- 내신 시험대비 시스템 Phase 1: 홀드 트리거 + 선생님 확인.
-- 방식(사용자 확정): 완전 승인게이트 아님 — 준비기간 시작 3일 전에 선생님/admin
-- 전원에게 통지만 하고, 명시적으로 "취소"하지 않으면 예정대로 자동 실행된다.
-- 이미 홀드가 걸린 뒤에도 "되돌리기"로 즉시 원복 가능해야 함(사용자: "홀드할 필요가
-- 없으면 다시 돌리도록").
--
-- school_exam_periods 1개당 요청 레코드 1개(unique). status 흐름:
--   scheduled(D-3 통지 보냄, 자동실행 예정) → held(실제 홀드 적용됨)
--                                          → resumed(시험기간 종료로 자동 해제)
--   scheduled 상태에서 취소 → canceled (홀드 자체가 실행 안 됨)
--   held 상태에서 되돌리기 → canceled (이미 건 홀드를 즉시 원복)

create table if not exists exam_mode_requests (
  id uuid primary key default gen_random_uuid(),
  school_exam_period_id uuid not null references school_exam_periods(id) on delete cascade,
  status text not null default 'scheduled' check (status in ('scheduled', 'held', 'canceled', 'resumed')),
  notified_at timestamptz,
  held_at timestamptz,
  canceled_at timestamptz,
  canceled_by uuid references auth.users(id),
  resumed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (school_exam_period_id)
);

alter table exam_mode_requests enable row level security;

drop policy if exists "exam_mode_requests_admin_all" on exam_mode_requests;
create policy "exam_mode_requests_admin_all"
  on exam_mode_requests
  for all
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'teacher')))
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'teacher')));

-- student_vocab_plans / student_homework_plans에 "왜 paused인지"를 식별할 수 있어야
-- exam-mode가 되돌릴 때 다른 이유로(수동) 멈춰둔 플랜까지 실수로 재개시키지 않는다.
-- 두 테이블 다 이미 paused_reason(text)이 있으므로 'exam_mode:<period_id>' 문자열을
-- 거기 적어서 표시한다 — 새 컬럼 불필요.
