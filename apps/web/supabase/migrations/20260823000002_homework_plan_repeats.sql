-- 교재 회독(반복) 지원.
-- 지금까지 student_homework_plans.cursor_unit_index는 마지막 유닛을 넘어가면 그냥 멈췄다 —
-- "이 책을 몇 번 반복할지(X회독)" 목표를 잡을 수 있게 필드를 추가한다.

alter table student_homework_plans
  add column if not exists target_repeat_count int not null default 1,
  add column if not exists current_repeat_number int not null default 1;

-- photo_homework은 지금까지 unit_index만으로 중복 생성을 막았는데, 회독이 생기면
-- 같은 unit_index가 lap(회차)마다 다시 나와야 하므로 lap 번호를 같이 저장해서 구분한다.
alter table photo_homework
  add column if not exists repeat_number int not null default 1;
