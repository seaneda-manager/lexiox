import "server-only";
import { getServiceRoleClient } from "@/lib/supabase/server";
import { todayKst } from "@/lib/grammar/planSchedule";

export type NaesinApplyResult = {
  students: number;
  skipped: { name: string; reason: string }[];
  firstDate: string | null;
  lastDate: string | null;
  /** 마지막 배정일이 시험 시작일 이후면 true — 시험 전에 다 못 끝낸다 */
  overflow: boolean;
};

function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 시작일부터 요일(0=일…6=토) 조건에 맞는 날에 회당 perSession 개씩 순서대로 날짜를 붙인다. */
export function layoutConcepts(conceptIds: string[], startDate: string, weekdays: number[], perSession: number) {
  const rows: { concept_id: string; scheduled_date: string; seq: number }[] = [];
  let i = 0;
  for (let day = 0; day < 400 && i < conceptIds.length; day++) {
    const date = addDays(startDate, day);
    const wd = new Date(date + "T00:00:00Z").getUTCDay();
    if (!weekdays.includes(wd)) continue;
    for (let s = 0; s < perSession && i < conceptIds.length; s++, i++) rows.push({ concept_id: conceptIds[i], scheduled_date: date, seq: s + 1 });
  }
  return rows;
}

/**
 * 시험기간 × 학년의 시험 범위(exam_period_concepts)를, 그 학교·학년 학생 전원의 "내신" 문법 플랜으로 만든다.
 * 이미 있는 내신 플랜은 같은 시험기간이면 덮어쓴다(끝낸 기록 student_grammar_concept_done 은 건드리지 않는다).
 * 정규 플랜은 건드리지 않는다 — 보류는 hold 가 따로 처리한다.
 */
export async function applyNaesinPlans(periodId: string, opts: { grade: string; weekdays: number[]; perSession: number }): Promise<NaesinApplyResult | { error: string }> {
  const db = getServiceRoleClient();
  const weekdays = [...new Set(opts.weekdays)].filter((w) => Number.isInteger(w) && w >= 0 && w <= 6).sort();
  if (weekdays.length === 0) return { error: "요일을 하나 이상 선택하세요." };
  if (!Number.isInteger(opts.perSession) || opts.perSession < 1 || opts.perSession > 10) return { error: "회당 개념 수는 1~10 입니다." };

  const { data: period } = await db.from("school_exam_periods").select("id, school_id, start_date, prep_start_date").eq("id", periodId).maybeSingle();
  if (!period) return { error: "시험기간을 찾을 수 없습니다." };

  const { data: scope } = await db
    .from("exam_period_concepts")
    .select("concept_id, level, sort_order")
    .eq("exam_period_id", periodId)
    .eq("grade", opts.grade)
    .order("sort_order");
  if (!scope || scope.length === 0) return { error: "이 학년의 시험 범위가 비어 있습니다. 먼저 범위를 저장하세요." };
  const level = Math.min(...scope.map((s: any) => Number(s.level) || 1));
  const conceptIds = scope.map((s: any) => s.concept_id as string);

  const { data: students } = await db
    .from("academy_students")
    .select("id, full_name, display_name, grade, auth_user_id, is_active")
    .eq("school_id", period.school_id)
    .eq("is_active", true)
    .eq("grade", opts.grade);
  const list = (students ?? []) as any[];
  if (list.length === 0) return { error: "이 학교·학년에 연결된 학생이 없습니다. 학교 관리에서 학생의 학교를 먼저 연결하세요." };

  const today = todayKst();
  const startDate = period.prep_start_date > today ? period.prep_start_date : today;
  const skipped: NaesinApplyResult["skipped"] = [];
  let count = 0;
  let firstDate: string | null = null;
  let lastDate: string | null = null;

  for (const st of list) {
    const name = st.full_name || st.display_name || st.id;
    if (!st.auth_user_id) {
      skipped.push({ name, reason: "로그인 계정이 없습니다" });
      continue;
    }
    const fields = {
      level,
      start_date: startDate,
      weekdays,
      units_per_session: opts.perSession,
      is_enabled: true,
      is_paused: false,
      paused_reason: null,
      exam_period_id: periodId,
      book_id: null,
      current_unit_id: null,
      kind: "naesin",
      updated_at: new Date().toISOString(),
    };
    const { data: existing } = await db.from("student_grammar_concept_plans").select("id").eq("student_id", st.auth_user_id).eq("kind", "naesin").maybeSingle();
    let planId = existing?.id as string | undefined;
    if (planId) {
      const { error } = await db.from("student_grammar_concept_plans").update(fields).eq("id", planId);
      if (error) { skipped.push({ name, reason: error.message }); continue; }
    } else {
      const { data: created, error } = await db.from("student_grammar_concept_plans").insert({ ...fields, student_id: st.auth_user_id }).select("id").single();
      if (error || !created) { skipped.push({ name, reason: error?.message ?? "플랜 생성 실패" }); continue; }
      planId = created.id as string;
    }

    const { data: done } = await db.from("student_grammar_concept_done").select("concept_id").eq("student_id", st.auth_user_id).eq("level", level);
    const doneSet = new Set((done ?? []).map((d: any) => d.concept_id as string));
    const rows = layoutConcepts(conceptIds.filter((c) => !doneSet.has(c)), startDate, weekdays, opts.perSession);

    const del = await db.from("student_grammar_concept_assignments").delete().eq("plan_id", planId);
    if (del.error) { skipped.push({ name, reason: del.error.message }); continue; }
    if (rows.length > 0) {
      const ins = await db.from("student_grammar_concept_assignments").insert(rows.map((r) => ({ ...r, plan_id: planId, student_id: st.auth_user_id })));
      if (ins.error) { skipped.push({ name, reason: ins.error.message }); continue; }
      firstDate = !firstDate || rows[0].scheduled_date < firstDate ? rows[0].scheduled_date : firstDate;
      const last = rows[rows.length - 1].scheduled_date;
      lastDate = !lastDate || last > lastDate ? last : lastDate;
    }
    count++;
  }

  return { students: count, skipped, firstDate, lastDate, overflow: !!lastDate && lastDate >= period.start_date };
}
