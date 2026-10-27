-- 문법 관문(팝업 퀴즈) 포인트: 주관식 정답 적립 + 객관식 오답 감점(0점 아래로는 내려가지 않음)

insert into point_rules (id, label, category, base_points, first_try_bonus) values
  ('grammar_gate_correct', '문법 관문 주관식 정답', 'grammar', 3, 0),
  ('grammar_gate_penalty', '문법 관문 객관식 오답 감점', 'grammar', 0, 0)
on conflict (id) do nothing;

create or replace function apply_grammar_gate_penalty(
  p_student_id uuid,
  p_points     integer,
  p_source_ref text    default null,
  p_metadata   jsonb   default null
) returns integer
language plpgsql security definer
set search_path = public
as $$
declare
  v_prev    integer;
  v_applied integer;
begin
  select total_points into v_prev
  from student_gamification
  where student_id = p_student_id
  for update;

  v_prev := coalesce(v_prev, 0);
  v_applied := least(greatest(p_points, 0), v_prev);   -- 0점 아래로는 내려가지 않음
  if v_applied <= 0 then
    return 0;
  end if;

  insert into student_point_ledger (student_id, rule_id, points, bonus_points, source_ref, metadata)
  values (p_student_id, 'grammar_gate_penalty', -v_applied, 0, p_source_ref, p_metadata);

  update student_gamification
     set total_points = v_prev - v_applied,
         updated_at   = now()
   where student_id = p_student_id;

  return v_applied;
end;
$$;

-- award_points 와 같이 service role 에서만 실행
revoke execute on function apply_grammar_gate_penalty(uuid, integer, text, jsonb) from public, anon, authenticated;
