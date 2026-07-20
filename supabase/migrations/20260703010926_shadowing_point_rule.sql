-- 쉐도잉 게임 문장 통과 포인트 룰
insert into point_rules (id, label, category, base_points, first_try_bonus, description, is_active)
values (
  'shadowing_sentence',
  '쉐도잉 문장 통과',
  'speaking',
  5,
  3,
  '쉐도잉 게임에서 문장을 통과(Pass 이상)했을 때 지급',
  true
)
on conflict (id) do nothing;
