-- =====================================================================
-- Vocab "Course" 모델로 통합
-- - 세트가 순서(order_index)와 소속 과정(track_id)을 스스로 가진다
-- - 연결 테이블(vocab_track_sets) 은퇴 준비: day_index/track_id 를 vocab_sets 로 백필
-- - 플랜에 sets_per_day(하루 몇 세트) 추가
--
-- ⚠ 안전장치: 같은 세트가 여러 (track, day) 에 중복 연결돼 있으면
--    백필이 애매해지므로 즉시 중단하고 알린다.
-- =====================================================================

-- 0) 안전 검사: 세트 중복 사용 여부
do $$
declare
  conflict_count integer;
begin
  select count(*) into conflict_count
  from (
    select set_id
    from public.vocab_track_sets
    group by set_id
    having count(*) > 1
  ) t;

  if conflict_count > 0 then
    raise exception
      'ABORT: % 개의 세트가 여러 과정/Day 에 중복 연결돼 있습니다. 백필 전에 수동 정리가 필요합니다.',
      conflict_count;
  end if;
end $$;

-- 1) 세트에 순서 컬럼 추가
alter table public.vocab_sets
  add column if not exists order_index integer;

-- 2) 연결 테이블에서 순서/소속 백필
--    (vocab_track_sets.day_index -> vocab_sets.order_index)
--    (vocab_track_sets.track_id  -> vocab_sets.track_id, 비어있을 때만)
update public.vocab_sets vs
set
  order_index = vts.day_index,
  track_id = coalesce(vs.track_id, vts.track_id)
from public.vocab_track_sets vts
where vts.set_id = vs.id;

-- 3) 고아 세트 백필: track_id 는 있는데(옛 버그 경로) 순서가 없는 세트
--    -> 같은 과정 안에서 created_at 순으로 1..N 부여
--    (연결 테이블에 없어서 위 2단계로 순서를 못 받은 세트만 대상)
with orphans as (
  select
    id,
    row_number() over (partition by track_id order by created_at, id) as rn
  from public.vocab_sets
  where track_id is not null
    and order_index is null
)
update public.vocab_sets vs
set order_index = orphans.rn
from orphans
where orphans.id = vs.id;

-- 4) 조회 성능용 인덱스 (과정 안에서 순서대로)
create index if not exists idx_vocab_sets_track_order
  on public.vocab_sets (track_id, order_index);

-- 5) 플랜에 하루 세트 수
alter table public.student_vocab_plans
  add column if not exists sets_per_day integer not null default 1;
