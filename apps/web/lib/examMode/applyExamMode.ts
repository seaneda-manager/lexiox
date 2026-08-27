// apps/web/lib/examMode/applyExamMode.ts
// 내신 시험대비 시스템 Phase 1: 홀드 트리거 실행 로직.
// 이 파일의 함수들은 cron(/api/cron/exam-mode-check)과 admin 되돌리기 버튼
// 양쪽에서 공유해서 쓴다 — 로직이 두 군데 흩어지면 동작이 갈릴 위험이 있어서 하나로 모음.

import { getServiceRoleClient } from "@/lib/supabase/server";
import { sendBulkEmails } from "@/lib/utils/emailService";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysISO(dateISO: string, days: number): string {
  const d = new Date(dateISO + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function pauseTag(periodId: string): string {
  return `exam_mode:${periodId}`;
}

async function getStudentIdsForSchool(supabase: ReturnType<typeof getServiceRoleClient>, schoolId: string): Promise<string[]> {
  const { data } = await supabase
    .from("academy_students")
    .select("id")
    .eq("school_id", schoolId)
    .eq("is_active", true);
  return (data ?? []).map((r: any) => r.id as string);
}

/**
 * D-3 통지: 준비기간 시작이 3일 남은 학교-시험을 찾아 exam_mode_requests row를
 * 만들고(없으면) 선생님/admin 전원에게 이메일 발송. 이미 요청이 있으면 건너뜀(중복방지).
 */
export async function notifyUpcomingExamModes(): Promise<{ notified: number; errors: string[] }> {
  const supabase = getServiceRoleClient();
  const errors: string[] = [];
  const targetPrepStart = addDaysISO(todayISO(), 3);

  const { data: periods, error: pErr } = await supabase
    .from("school_exam_periods")
    .select("id, school_id, year, semester, exam_type, start_date, end_date, prep_start_date, schools(name)")
    .eq("prep_start_date", targetPrepStart);
  if (pErr) {
    errors.push(`periods lookup failed: ${pErr.message}`);
    return { notified: 0, errors };
  }

  let notified = 0;
  for (const period of periods ?? []) {
    const p = period as any;
    const existing = await supabase
      .from("exam_mode_requests")
      .select("id")
      .eq("school_exam_period_id", p.id)
      .maybeSingle();
    if (existing.data) continue; // 이미 통지됨

    const ins = await supabase
      .from("exam_mode_requests")
      .insert({ school_exam_period_id: p.id, status: "scheduled", notified_at: new Date().toISOString() })
      .select("id")
      .single();
    if (ins.error) {
      errors.push(`insert failed for period ${p.id}: ${ins.error.message}`);
      continue;
    }

    const { data: teachers } = await supabase
      .from("profiles")
      .select("email, full_name")
      .in("role", ["teacher", "admin"]);

    const recipients = (teachers ?? [])
      .filter((t: any): t is { email: string; full_name: string | null } => !!t.email)
      .map((t: any) => ({ name: t.full_name || "선생님", email: t.email }));

    if (recipients.length > 0) {
      await sendBulkEmails(recipients, "exam-mode-notice", {
        schoolName: p.schools?.name || "학교",
        examTypeLabel: p.exam_type === "midterm" ? "중간고사" : "기말고사",
        prepStartDate: p.prep_start_date,
        examStartDate: p.start_date,
        examEndDate: p.end_date,
        periodId: p.id,
      });
    }

    notified++;
  }

  return { notified, errors };
}

/**
 * status='scheduled'이고 준비기간 시작일이 된(또는 지난) 요청을 찾아 실제로 홀드 실행.
 * 해당 학교 학생들의 student_vocab_plans/student_homework_plans 중 이미 is_paused가
 * 아닌 것만 골라 exam_mode 태그를 남기고 멈춘다(수동으로 이미 멈춰둔 건 안 건드림).
 */
export async function executeScheduledHolds(): Promise<{ held: number; errors: string[] }> {
  const supabase = getServiceRoleClient();
  const errors: string[] = [];
  const today = todayISO();

  const { data: requests, error: rErr } = await supabase
    .from("exam_mode_requests")
    .select("id, school_exam_period_id, status, school_exam_periods(id, school_id, prep_start_date)")
    .eq("status", "scheduled");
  if (rErr) {
    errors.push(`requests lookup failed: ${rErr.message}`);
    return { held: 0, errors };
  }

  let held = 0;
  for (const req of requests ?? []) {
    const r = req as any;
    const period = r.school_exam_periods;
    if (!period || period.prep_start_date > today) continue;

    const studentIds = await getStudentIdsForSchool(supabase, period.school_id);
    const tag = pauseTag(r.school_exam_period_id);

    if (studentIds.length > 0) {
      const vErr = await supabase
        .from("student_vocab_plans")
        .update({ is_paused: true, paused_reason: tag })
        .in("student_id", studentIds)
        .eq("is_paused", false);
      if (vErr.error) errors.push(`vocab pause failed for period ${r.school_exam_period_id}: ${vErr.error.message}`);

      const hErr = await supabase
        .from("student_homework_plans")
        .update({ is_paused: true, paused_reason: tag })
        .in("student_id", studentIds)
        .eq("is_paused", false);
      if (hErr.error) errors.push(`homework pause failed for period ${r.school_exam_period_id}: ${hErr.error.message}`);
    }

    const upd = await supabase
      .from("exam_mode_requests")
      .update({ status: "held", held_at: new Date().toISOString() })
      .eq("id", r.id);
    if (upd.error) {
      errors.push(`status update failed for request ${r.id}: ${upd.error.message}`);
      continue;
    }
    held++;
  }

  return { held, errors };
}

/**
 * status='held'이고 시험 종료일이 지난 요청을 찾아 자동 해제.
 * 이 exam_mode 태그로 멈춘 플랜만 골라서 재개(다른 이유로 멈춘 건 안 건드림).
 */
export async function resumeExpiredHolds(): Promise<{ resumed: number; errors: string[] }> {
  const supabase = getServiceRoleClient();
  const errors: string[] = [];
  const today = todayISO();

  const { data: requests, error: rErr } = await supabase
    .from("exam_mode_requests")
    .select("id, school_exam_period_id, status, school_exam_periods(end_date)")
    .eq("status", "held");
  if (rErr) {
    errors.push(`requests lookup failed: ${rErr.message}`);
    return { resumed: 0, errors };
  }

  let resumed = 0;
  for (const req of requests ?? []) {
    const r = req as any;
    const period = r.school_exam_periods;
    if (!period || period.end_date >= today) continue;

    const result = await revertExamModeHold(r.school_exam_period_id, null, "resumed");
    if (!result.ok) {
      errors.push(`resume failed for period ${r.school_exam_period_id}: ${result.error}`);
      continue;
    }
    resumed++;
  }

  return { resumed, errors };
}

/**
 * 되돌리기(사람이 트리거) — scheduled 상태면 실행 자체를 취소, held 상태면 즉시 원복.
 * finalStatus는 cron의 자연 만료(resumed)와 사람의 수동 취소(canceled)를 구분하기 위함.
 */
export async function revertExamModeHold(
  schoolExamPeriodId: string,
  canceledBy: string | null,
  finalStatus: "canceled" | "resumed" = "canceled",
) {
  try {
    const supabase = getServiceRoleClient();

    const { data: reqRow, error: reqErr } = await supabase
      .from("exam_mode_requests")
      .select("id, status, school_exam_periods(school_id)")
      .eq("school_exam_period_id", schoolExamPeriodId)
      .maybeSingle();
    if (reqErr) throw new Error(reqErr.message);
    if (!reqRow) throw new Error("해당 시험기간의 exam-mode 요청을 찾을 수 없습니다.");

    const wasHeld = (reqRow as any).status === "held";
    const schoolId = (reqRow as any).school_exam_periods?.school_id as string | undefined;
    const tag = pauseTag(schoolExamPeriodId);

    if (wasHeld && schoolId) {
      const studentIds = await getStudentIdsForSchool(supabase, schoolId);
      if (studentIds.length > 0) {
        await supabase
          .from("student_vocab_plans")
          .update({ is_paused: false, paused_reason: null })
          .in("student_id", studentIds)
          .eq("paused_reason", tag);

        await supabase
          .from("student_homework_plans")
          .update({ is_paused: false, paused_reason: null })
          .in("student_id", studentIds)
          .eq("paused_reason", tag);
      }
    }

    const patch: Record<string, unknown> = { status: finalStatus };
    if (finalStatus === "canceled") {
      patch.canceled_at = new Date().toISOString();
      patch.canceled_by = canceledBy;
    } else {
      patch.resumed_at = new Date().toISOString();
    }

    const upd = await supabase.from("exam_mode_requests").update(patch).eq("id", (reqRow as any).id);
    if (upd.error) throw new Error(upd.error.message);

    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "되돌리기 실패" };
  }
}
