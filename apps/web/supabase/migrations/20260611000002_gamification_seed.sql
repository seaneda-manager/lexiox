-- 샘플 Perk 데이터
insert into perk_catalog (perk_type, name, description, point_cost, stock) values
  -- 아바타 아이템
  ('avatar_item', '왕관 🎓',        '레벨 달성 기념 왕관 아이템',    300,  null),
  ('avatar_item', '날개 🪶',        '열심히 공부한 학생에게 날개',   500,  null),
  ('avatar_item', '망토 🦸',        '슈퍼 히어로 망토',             800,  null),
  ('avatar_item', '황금 메달 🥇',   '최고 학습자 메달',            1500,  null),
  -- 테마
  ('theme',       '다크 테마 🌙',   '앱 전체 다크 모드 테마',       400,  null),
  ('theme',       '하늘 테마 ☀️',   '밝고 시원한 하늘색 테마',      400,  null),
  ('theme',       '포레스트 테마 🌿', '눈에 편한 그린 테마',         600,  null),
  -- 실물 보상
  ('physical',    '음료 교환권 ☕',  '학원 내 음료 1잔 무료',        500,  20),
  ('physical',    '편의점 상품권 🏪', '편의점 5천원 상품권',        1000,  10),
  ('physical',    '문화상품권 🎬',   '문화상품권 1만원',            2000,   5)
on conflict do nothing;
