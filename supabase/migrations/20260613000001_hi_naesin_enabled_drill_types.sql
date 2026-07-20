-- hi_naesin_assignments에 drill 타입별 활성화 목록 추가
-- NULL = 전체 허용 (기존 배정 호환)
-- 값이 있으면 해당 타입만 학생에게 노출

alter table public.hi_naesin_assignments
  add column if not exists enabled_drill_types text[] default null;
