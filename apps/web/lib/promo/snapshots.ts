import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addMonths, kstDayStartIso, monthStart, todayKST } from "./dates";
import type { LearningMetrics } from "./types";

/**
 * 가맹점의 한 달 학습 통계를 집계해 promo_learning_snapshots에 저장한다.
 * 학생 소속: academy_students.org_id, 없으면 academy_classes.org_id를 통한 반 소속으로 판단.
 * 결과에는 숫자만 남기고 학생 식별 정보는 저장하지 않는다.
 * 반드시 service role 클라이언트로 호출한다 (cron, 본사 수동 갱신).
 */

const CHUNK = 200;
function chunks<T>(arr: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += CHUNK) out.push(arr.slice(i, i + CHUNK));
  return out;
}

type StudentRow = {
  id: string;
  grade: string | null;
  created_at: string;
  auth_user_id: string | null;
  user_id: string | null;
  profile_id: string | null;
};

function band(grade: string | null): "초등" | "중등" | "고등" | "기타" {
  const g = (grade ?? "").trim();
  if (g.startsWith("초") || /^elem/i.test(g)) return "초등";
  if (g.startsWith("중") || /^middle/i.test(g)) return "중등";
  if (g.startsWith("고") || /^high/i.test(g)) return "고등";
  return "기타";
}

async function orgStudents(svc: SupabaseClient, orgId: string): Promise<StudentRow[]> {
  const cols = "id, grade, created_at, auth_user_id, user_id, profile_id";
  const { data: direct } = await svc
    .from("academy_students")
    .select(cols)
    .eq("org_id", orgId)
    .eq("is_active", true);
  const byId = new Map<string, StudentRow>();
  (direct ?? []).forEach((s) => byId.set(s.id, s as StudentRow));

  // 반을 통한 소속 (academy_students.org_id가 아직 비어 있는 학생)
  const { data: classes } = await svc.from("academy_classes").select("id").eq("org_id", orgId);
  const classIds = (classes ?? []).map((c) => c.id as string);
  if (classIds.length) {
    const memberIds = new Set<string>();
    for (const part of chunks(classIds)) {
      const { data } = await svc.from("academy_class_students").select("student_id").in("class_id", part);
      (data ?? []).forEach((r) => memberIds.add(r.student_id as string));
    }
    const missing = [...memberIds].filter((id) => !byId.has(id));
    for (const part of chunks(missing)) {
      const { data } = await svc
        .from("academy_students")
        .select(cols + ", org_id")
        .in("id", part)
        .eq("is_active", true)
        .is("org_id", null);
      (data ?? []).forEach((s) => byId.set((s as unknown as StudentRow).id, s as unknown as StudentRow));
    }
  }
  return [...byId.values()];
}

export async function computeOrgSnapshot(
  svc: SupabaseClient,
  orgId: string,
  periodMonth: string // YYYY-MM-01
): Promise<LearningMetrics> {
  const next = addMonths(periodMonth, 1);
  const fromIso = kstDayStartIso(periodMonth);
  const toIso = kstDayStartIso(next);

  const students = await orgStudents(svc, orgId);
  const ids = students.map((s) => s.id);
  const authIds = [
    ...new Set(students.flatMap((s) => [s.auth_user_id, s.user_id, s.profile_id]).filter(Boolean) as string[]),
  ];

  const byBand = { 초등: 0, 중등: 0, 고등: 0, 기타: 0 };
  students.forEach((s) => (byBand[band(s.grade)] += 1));
  const newThisMonth = students.filter((s) => s.created_at >= fromIso && s.created_at < toIso).length;

  // 어휘 드릴 (일별 롤업)
  let drillTotal = 0;
  let drillCorrect = 0;
  const drillStudents = new Set<string>();
  for (const part of chunks(ids)) {
    const { data } = await svc
      .from("vocab_drill_daily_rollups")
      .select("academy_student_id, total, correct")
      .in("academy_student_id", part)
      .gte("day", periodMonth)
      .lt("day", next);
    (data ?? []).forEach((r) => {
      drillTotal += Number(r.total) || 0;
      drillCorrect += Number(r.correct) || 0;
      if ((Number(r.total) || 0) > 0) drillStudents.add(r.academy_student_id as string);
    });
  }

  // 어휘 세트 완료
  let setsCompleted = 0;
  for (const part of chunks(ids)) {
    const { count } = await svc
      .from("student_vocab_assignments")
      .select("id", { count: "exact", head: true })
      .in("student_id", part)
      .eq("status", "COMPLETED")
      .gte("completed_at", fromIso)
      .lt("completed_at", toIso);
    setsCompleted += count ?? 0;
  }

  // 과제
  let hwCount = 0;
  let hwCorrect = 0;
  let hwTotal = 0;
  for (const part of chunks(authIds)) {
    const { data } = await svc
      .from("homework_results")
      .select("correct_count, total_count")
      .in("user_id", part)
      .gte("completed_at", fromIso)
      .lt("completed_at", toIso);
    (data ?? []).forEach((r) => {
      hwCount += 1;
      hwCorrect += Number(r.correct_count) || 0;
      hwTotal += Number(r.total_count) || 0;
    });
  }

  // 리딩 테스트
  let readingTests = 0;
  for (const part of chunks(authIds)) {
    const { count } = await svc
      .from("reading_results_2026")
      .select("id", { count: "exact", head: true })
      .in("user_id", part)
      .gte("finished_at", fromIso)
      .lt("finished_at", toIso);
    readingTests += count ?? 0;
  }

  const round1 = (v: number) => Math.round(v * 10) / 10;
  return {
    students: { active: students.length, newThisMonth, byBand },
    vocab: {
      activeStudents: drillStudents.size,
      drillTotal,
      drillCorrect,
      accuracy: drillTotal ? round1((drillCorrect / drillTotal) * 100) : null,
      setsCompleted,
    },
    homework: { submissions: hwCount, accuracy: hwTotal ? round1((hwCorrect / hwTotal) * 100) : null },
    reading: { testsFinished: readingTests },
  };
}

export async function refreshOrgSnapshot(svc: SupabaseClient, orgId: string, periodMonth: string) {
  const metrics = await computeOrgSnapshot(svc, orgId, periodMonth);
  const { error } = await svc
    .from("promo_learning_snapshots")
    .upsert({ org_id: orgId, period_month: periodMonth, metrics, computed_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  return metrics;
}

/** 모든 가맹점의 이번 달(월초 3일간은 지난달도) 스냅샷 갱신 */
export async function refreshAllSnapshots(svc: SupabaseClient) {
  const today = todayKST();
  const months = [monthStart(today)];
  if (Number(today.slice(8, 10)) <= 3) months.push(addMonths(monthStart(today), -1));

  const { data: orgs } = await svc.from("organizations").select("id").eq("kind", "branch");
  const results: { orgId: string; ok: boolean; error?: string }[] = [];
  for (const o of orgs ?? []) {
    for (const m of months) {
      try {
        await refreshOrgSnapshot(svc, o.id as string, m);
        results.push({ orgId: o.id as string, ok: true });
      } catch (e) {
        results.push({ orgId: o.id as string, ok: false, error: e instanceof Error ? e.message : String(e) });
      }
    }
  }
  return results;
}
