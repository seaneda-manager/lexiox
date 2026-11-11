import "server-only";
import { getServiceSupabase } from "@/lib/supabase/service";
import { planGrammarSchedule, todayKst, type PlanUnit } from "@/lib/grammar/planSchedule";

type Result = { created: number } | { error: string };

type PlanRow = {
  id: string;
  student_id: string;
  book_id: string | null;
  current_unit_id: string | null;
  level: number;
  start_date: string;
  weekdays: number[] | null;
  units_per_session: number | null;
  is_enabled: boolean;
  is_paused: boolean;
};

/**
 * 배정 순서대로 펼친 개념 id.
 *  - 교재가 있으면: 현재 단원부터 교재 순서대로 단원에 연결된 개념. 같은 개념이 여러 단원에 걸려 있어도 한 번만 넣고,
 *    현재 단원 앞 단원에서 이미 다룬 개념은 이미 배운 것으로 보고 뺀다.
 *  - 교재가 없으면: null (개념 난이도순 = difficulty_rank 를 그대로 쓴다).
 */
async function loadBookConceptOrder(bookId: string | null, currentUnitId: string | null): Promise<string[] | null> {
  if (!bookId) return null;
  const db = getServiceSupabase();
  const { data: units } = await db.from("grammar_book_units").select("id, sort_order").eq("book_id", bookId).order("sort_order");
  const list = (units ?? []) as { id: string; sort_order: number }[];
  if (list.length === 0) return [];
  const cur = currentUnitId ? list.find((u) => u.id === currentUnitId) : null;
  const startOrder = cur ? cur.sort_order : list[0].sort_order;

  const { data: links } = await db
    .from("grammar_unit_concepts")
    .select("unit_id, concept_id, sort_order")
    .in("unit_id", list.map((u) => u.id));
  const byUnit = new Map<string, { concept_id: string; sort_order: number }[]>();
  for (const l of (links ?? []) as { unit_id: string; concept_id: string; sort_order: number }[]) {
    const arr = byUnit.get(l.unit_id) ?? [];
    arr.push(l);
    byUnit.set(l.unit_id, arr);
  }
  const conceptsOf = (unitId: string) => (byUnit.get(unitId) ?? []).sort((a, b) => a.sort_order - b.sort_order).map((l) => l.concept_id);

  const passed = new Set<string>();
  for (const u of list.filter((x) => x.sort_order < startOrder)) for (const c of conceptsOf(u.id)) passed.add(c);

  const order: string[] = [];
  const seen = new Set<string>();
  for (const u of list.filter((x) => x.sort_order >= startOrder)) {
    for (const c of conceptsOf(u.id)) {
      if (passed.has(c) || seen.has(c)) continue;
      seen.add(c);
      order.push(c);
    }
  }
  return order;
}

/** 아직 날짜가 없는 개념에 날짜를 붙여 저장한다. 여러 번 불러도 이미 있는 배정은 건드리지 않는다(멱등). */
export async function syncConceptPlan(planId: string): Promise<Result> {
  const db = getServiceSupabase();
  const { data: planData, error: planErr } = await db.from("student_grammar_concept_plans").select("*").eq("id", planId).single();
  if (planErr || !planData) return { error: planErr?.message ?? "플랜을 찾을 수 없습니다." };
  const plan = planData as PlanRow;
  if (!plan.is_enabled || plan.is_paused) return { created: 0 };

  const [{ data: concepts }, { data: done }, { data: existing }, bookOrder] = await Promise.all([
    db.from("grammar_concepts").select("id, difficulty_rank, status"),
    db.from("student_grammar_concept_done").select("concept_id").eq("student_id", plan.student_id).eq("level", plan.level),
    db.from("student_grammar_concept_assignments").select("concept_id, scheduled_date, seq").eq("plan_id", planId),
    loadBookConceptOrder(plan.book_id, plan.current_unit_id),
  ]);

  const units: PlanUnit[] = ((concepts ?? []) as { id: string; difficulty_rank: number; status: string }[]).map((c) => ({
    id: c.id,
    order_index: c.difficulty_rank,
    level: "all",
    status: c.status,
  }));

  const rows = planGrammarSchedule({
    units,
    plan: {
      start_date: plan.start_date,
      weekdays: plan.weekdays ?? [],
      units_per_session: plan.units_per_session ?? 1,
      level: "all",
      start_unit_id: null,
      textbook_chapter_order: bookOrder,
    },
    completedIds: new Set((done ?? []).map((d: { concept_id: string }) => d.concept_id)),
    existing: ((existing ?? []) as { concept_id: string; scheduled_date: string; seq: number }[]).map((e) => ({
      unit_id: e.concept_id,
      scheduled_date: e.scheduled_date,
      seq: e.seq,
    })),
    todayIso: todayKst(),
  });
  if (rows.length === 0) return { created: 0 };

  const { error } = await db
    .from("student_grammar_concept_assignments")
    .insert(rows.map((r) => ({ concept_id: r.unit_id, scheduled_date: r.scheduled_date, seq: r.seq, plan_id: planId, student_id: plan.student_id })));
  if (error) return { error: error.message };
  return { created: rows.length };
}

/** 오늘부터 다시 잡는다: 끝내지 않은 배정(밀린 것 포함)을 지우고 새로 만든다. 끝낸 개념의 배정은 기록으로 남긴다. */
export async function rescheduleConceptPlan(planId: string): Promise<Result> {
  const db = getServiceSupabase();
  const { data: plan } = await db.from("student_grammar_concept_plans").select("student_id, level").eq("id", planId).maybeSingle();
  if (!plan) return { error: "플랜을 찾을 수 없습니다." };

  const [{ data: done }, { data: current }] = await Promise.all([
    db.from("student_grammar_concept_done").select("concept_id").eq("student_id", plan.student_id).eq("level", plan.level),
    db.from("student_grammar_concept_assignments").select("id, concept_id").eq("plan_id", planId),
  ]);
  const doneSet = new Set((done ?? []).map((d: { concept_id: string }) => d.concept_id));
  const dropIds = ((current ?? []) as { id: string; concept_id: string }[]).filter((a) => !doneSet.has(a.concept_id)).map((a) => a.id);
  if (dropIds.length > 0) {
    const { error } = await db.from("student_grammar_concept_assignments").delete().in("id", dropIds);
    if (error) return { error: error.message };
  }
  return syncConceptPlan(planId);
}
