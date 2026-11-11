import "server-only";
import { getServiceSupabase } from "@/lib/supabase/service";
import { planGrammarSchedule, todayKst, type PlanUnit } from "@/lib/grammar/planSchedule";

type Result = { created: number } | { error: string };

/**
 * 학생의 문법 플랜에 맞춰, 아직 날짜가 없는 챕터에 날짜를 붙여 저장한다.
 * 여러 번 불러도 이미 있는 배정은 건드리지 않고 모자란 것만 추가한다(멱등).
 * 챕터가 새로 추가됐거나 플랜을 바꿨을 때, 또는 "재동기화" 버튼에서 호출한다.
 */
export async function syncGrammarPlan(planId: string): Promise<Result> {
  const db = getServiceSupabase();
  const { data: plan, error: planErr } = await db.from("student_grammar_plans").select("*").eq("id", planId).single();
  if (planErr || !plan) return { error: planErr?.message ?? "플랜을 찾을 수 없습니다." };
  if (!plan.is_enabled || plan.is_paused) return { created: 0 };

  const [{ data: units }, { data: done }, { data: existing }] = await Promise.all([
    db.from("grammar_2026_units").select("id, order_index, level, status"),
    db.from("grammar_2026_unit_completions").select("unit_id").eq("student_id", plan.student_id),
    db.from("student_grammar_assignments").select("unit_id, scheduled_date, seq").eq("plan_id", planId),
  ]);

  const rows = planGrammarSchedule({
    units: (units ?? []) as PlanUnit[],
    plan: {
      start_date: plan.start_date,
      weekdays: plan.weekdays ?? [],
      units_per_session: plan.units_per_session ?? 1,
      level: plan.level ?? "all",
      start_unit_id: plan.start_unit_id ?? null,
    },
    completedIds: new Set((done ?? []).map((d: { unit_id: string }) => d.unit_id)),
    existing: existing ?? [],
    todayIso: todayKst(),
  });
  if (rows.length === 0) return { created: 0 };

  const { error } = await db
    .from("student_grammar_assignments")
    .insert(rows.map((r) => ({ ...r, plan_id: planId, student_id: plan.student_id })));
  if (error) return { error: error.message };
  return { created: rows.length };
}

/**
 * 오늘부터 일정을 다시 잡는다: 아직 끝내지 않은 배정(밀린 것 포함)을 지우고 새로 만든다.
 * 이미 끝낸 챕터의 배정은 기록으로 남긴다. 페이스를 바꿨거나 오래 쉬었다가 다시 시작할 때 쓴다.
 */
export async function rescheduleGrammarPlan(planId: string): Promise<Result> {
  const db = getServiceSupabase();
  const { data: plan } = await db.from("student_grammar_plans").select("student_id").eq("id", planId).maybeSingle();
  if (!plan) return { error: "플랜을 찾을 수 없습니다." };

  const [{ data: done }, { data: current }] = await Promise.all([
    db.from("grammar_2026_unit_completions").select("unit_id").eq("student_id", plan.student_id),
    db.from("student_grammar_assignments").select("id, unit_id").eq("plan_id", planId),
  ]);
  const doneSet = new Set((done ?? []).map((d: { unit_id: string }) => d.unit_id));
  const dropIds = (current ?? []).filter((a: { unit_id: string }) => !doneSet.has(a.unit_id)).map((a: { id: string }) => a.id);
  if (dropIds.length > 0) {
    const { error } = await db.from("student_grammar_assignments").delete().in("id", dropIds);
    if (error) return { error: error.message };
  }
  return syncGrammarPlan(planId);
}
