"use server";

import { revalidatePath } from "next/cache";
import { getServiceRoleClient } from "@/lib/supabase/server";
import { getUserAndProfile } from "@/lib/getUserAndProfile";
import { applyNaesinPlans, type NaesinApplyResult } from "@/lib/examMode/naesinPlans";

// 시험 범위·영역별 예외는 선생님이 입력한다. admin(super)은 전권이라 같은 권한으로 통과한다.
async function requireStaff(): Promise<{ userId: string } | { error: string }> {
  const { user, profile } = await getUserAndProfile();
  if (!user) return { error: "로그인이 필요합니다." };
  if (profile?.role !== "admin" && profile?.role !== "teacher") return { error: "선생님/관리자만 사용할 수 있습니다." };
  return { userId: user.id };
}

export type PeriodOption = { id: string; label: string; schoolId: string; startDate: string; prepStartDate: string };
export type ConceptOption = { id: string; title: string; rank: number; finalLevels: number[] };
export type DomainHolds = { vocab: boolean; homework: boolean; grammar_regular: boolean };
export type PeriodDetail = {
  grades: { grade: string; students: number }[];
  scope: { grade: string; level: number; conceptIds: string[] }[];
  holds: DomainHolds;
};

export async function listPeriodsAction(): Promise<{ periods: PeriodOption[] } | { error: string }> {
  const who = await requireStaff();
  if ("error" in who) return who;
  const db = getServiceRoleClient();
  const { data, error } = await db
    .from("school_exam_periods")
    .select("id, school_id, year, semester, exam_type, start_date, prep_start_date, schools(name)")
    .order("start_date", { ascending: false });
  if (error) return { error: error.message };
  return {
    periods: (data ?? []).map((p: any) => ({
      id: p.id,
      schoolId: p.school_id,
      startDate: p.start_date,
      prepStartDate: p.prep_start_date,
      label: `${p.schools?.name ?? "학교"} · ${p.year}년 ${p.semester}학기 ${p.exam_type === "midterm" ? "중간" : "기말"} (${p.start_date})`,
    })),
  };
}

export async function listConceptsAction(): Promise<{ concepts: ConceptOption[] } | { error: string }> {
  const who = await requireStaff();
  if ("error" in who) return who;
  const db = getServiceRoleClient();
  const [{ data: cs, error }, { data: ls }] = await Promise.all([
    db.from("grammar_concepts").select("id, title_ko, difficulty_rank").order("difficulty_rank"),
    db.from("grammar_lessons").select("concept_id, level").eq("status", "final"),
  ]);
  if (error) return { error: error.message };
  const fin = new Map<string, number[]>();
  for (const l of (ls ?? []) as any[]) fin.set(l.concept_id, [...(fin.get(l.concept_id) ?? []), l.level]);
  return { concepts: (cs ?? []).map((c: any) => ({ id: c.id, title: c.title_ko, rank: c.difficulty_rank, finalLevels: fin.get(c.id) ?? [] })) };
}

export async function loadPeriodAction(periodId: string): Promise<PeriodDetail | { error: string }> {
  const who = await requireStaff();
  if ("error" in who) return who;
  const db = getServiceRoleClient();
  const { data: period } = await db.from("school_exam_periods").select("school_id").eq("id", periodId).maybeSingle();
  if (!period) return { error: "시험기간을 찾을 수 없습니다." };

  const [{ data: studs }, { data: scope }, { data: rules }] = await Promise.all([
    db.from("academy_students").select("grade").eq("school_id", period.school_id).eq("is_active", true),
    db.from("exam_period_concepts").select("grade, level, concept_id, sort_order").eq("exam_period_id", periodId).order("sort_order"),
    db.from("exam_period_domain_rules").select("domain, hold").eq("exam_period_id", periodId),
  ]);
  const gradeCount = new Map<string, number>();
  for (const s of (studs ?? []) as any[]) {
    const g = String(s.grade ?? "").trim();
    if (g) gradeCount.set(g, (gradeCount.get(g) ?? 0) + 1);
  }
  const byGrade = new Map<string, { level: number; conceptIds: string[] }>();
  for (const r of (scope ?? []) as any[]) {
    const e = byGrade.get(r.grade) ?? { level: r.level, conceptIds: [] };
    e.conceptIds.push(r.concept_id);
    byGrade.set(r.grade, e);
  }
  const holds: DomainHolds = { vocab: true, homework: true, grammar_regular: true };
  for (const r of (rules ?? []) as any[]) if (r.domain in holds) (holds as any)[r.domain] = r.hold !== false;
  return {
    grades: [...gradeCount.entries()].map(([grade, students]) => ({ grade, students })).sort((a, b) => a.grade.localeCompare(b.grade)),
    scope: [...byGrade.entries()].map(([grade, v]) => ({ grade, level: v.level, conceptIds: v.conceptIds })),
    holds,
  };
}

export async function saveScopeAction(input: { periodId: string; grade: string; level: number; conceptIds: string[] }): Promise<{ ok: true } | { error: string }> {
  const who = await requireStaff();
  if ("error" in who) return who;
  if (!input.grade) return { error: "학년을 선택하세요." };
  if (!Number.isInteger(input.level) || input.level < 1 || input.level > 5) return { error: "레벨은 1~5 입니다." };
  const db = getServiceRoleClient();
  const del = await db.from("exam_period_concepts").delete().eq("exam_period_id", input.periodId).eq("grade", input.grade);
  if (del.error) return { error: del.error.message };
  if (input.conceptIds.length > 0) {
    const ins = await db.from("exam_period_concepts").insert(
      input.conceptIds.map((concept_id, i) => ({ exam_period_id: input.periodId, grade: input.grade, concept_id, level: input.level, sort_order: i, created_by: who.userId })),
    );
    if (ins.error) return { error: ins.error.message };
  }
  revalidatePath("/admin/exam-scope");
  return { ok: true };
}

export async function saveHoldsAction(input: { periodId: string; holds: DomainHolds }): Promise<{ ok: true } | { error: string }> {
  const who = await requireStaff();
  if ("error" in who) return who;
  const db = getServiceRoleClient();
  const rows = (Object.keys(input.holds) as (keyof DomainHolds)[]).map((domain) => ({
    exam_period_id: input.periodId,
    domain,
    hold: input.holds[domain],
    updated_by: who.userId,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await db.from("exam_period_domain_rules").upsert(rows, { onConflict: "exam_period_id,domain" });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function applyNaesinAction(input: { periodId: string; grade: string; weekdays: number[]; perSession: number }): Promise<NaesinApplyResult | { error: string }> {
  const who = await requireStaff();
  if ("error" in who) return who;
  const r = await applyNaesinPlans(input.periodId, { grade: input.grade, weekdays: input.weekdays, perSession: input.perSession });
  revalidatePath("/student/grammar");
  return r;
}
