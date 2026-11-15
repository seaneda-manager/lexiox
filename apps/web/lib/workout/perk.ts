import { createHash } from "crypto";
import { getServiceSupabase } from "@/lib/supabase/service";

/**
 * 게임 "보상(perk)" 서버 공통 도구. 서비스 롤로만 쓴다(장부는 학생이 쓸 수 없다).
 * 표: game_perk_settings / academy_study_checks / game_perk_ledger (20261116000001)
 */

export type PerkReason = "homework_done" | "academy_checked" | "review_stage" | "teacher_grant" | "teacher_revoke" | "play_used";

export type PerkSettings = {
  homework_minutes: number;
  academy_minutes: number;
  review_bonus_minutes: number;
  review_daily_cap_minutes: number;
  carryover_cap_minutes: number;
};

const DEFAULTS: PerkSettings = {
  homework_minutes: 10,
  academy_minutes: 10,
  review_bonus_minutes: 5,
  review_daily_cap_minutes: 15,
  carryover_cap_minutes: 0,
};

/** 한국 시간 기준 오늘 날짜(YYYY-MM-DD) */
export function kstToday(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

export const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export async function getPerkSettings(): Promise<PerkSettings> {
  const db = getServiceSupabase();
  const { data } = await db.from("game_perk_settings").select("*").eq("id", 1).maybeSingle();
  return { ...DEFAULTS, ...(data ?? {}) } as PerkSettings;
}

export type GrantResult = { ok: true; duplicate: boolean } | { ok: false; error: string };

/** 장부에 분을 적립(+) 또는 차감(-)한다. 같은 숙제/체크로는 한 번만(중복이면 duplicate). */
export async function grantMinutes(opts: {
  studentId: string;
  minutes: number;
  reason: PerkReason;
  refType?: string;
  refId?: string;
  grantedBy?: string;
  day?: string;
}): Promise<GrantResult> {
  if (!Number.isFinite(opts.minutes) || opts.minutes === 0) return { ok: false, error: "minutes must be non-zero" };
  const db = getServiceSupabase();
  const { error } = await db.from("game_perk_ledger").insert({
    student_id: opts.studentId,
    day: opts.day ?? kstToday(),
    minutes: Math.round(opts.minutes),
    reason: opts.reason,
    ref_type: opts.refType ?? null,
    ref_id: opts.refId ?? null,
    granted_by: opts.grantedBy ?? null,
  });
  if (error) {
    if (error.code === "23505") return { ok: true, duplicate: true }; // 같은 사유·같은 대상으로 이미 적립됨
    return { ok: false, error: error.message };
  }
  return { ok: true, duplicate: false };
}

export type Balance = { balance: number; earnedToday: number; usedToday: number; carried: number };

/**
 * 오늘 놀 수 있는 분 = 오늘 적립 - 오늘 사용 (+ 이월 상한 안의 지난 남은 분).
 * 이월 상한이 0이면 하루가 지나면 소멸한다. 잔액은 음수가 되지 않는다.
 */
export async function getBalance(studentId: string, day = kstToday()): Promise<Balance> {
  const settings = await getPerkSettings();
  const db = getServiceSupabase();
  const from = new Date(Date.parse(`${day}T00:00:00Z`) - 30 * 86400000).toISOString().slice(0, 10);
  const { data } = await db.from("game_perk_ledger").select("day, minutes").eq("student_id", studentId).gte("day", from).lte("day", day);
  let today = 0;
  let earned = 0;
  let used = 0;
  let prior = 0;
  for (const r of data ?? []) {
    const m = r.minutes as number;
    if ((r.day as string) === day) {
      today += m;
      if (m > 0) earned += m;
      else used += -m;
    } else {
      prior += m;
    }
  }
  const carried = settings.carryover_cap_minutes > 0 ? Math.min(settings.carryover_cap_minutes, Math.max(0, prior)) : 0;
  return { balance: Math.max(0, today + carried), earnedToday: earned, usedToday: used, carried };
}

/**
 * 로그인 계정 ID → academy_students.id.
 * 단어 숙제 표(student_vocab_plans/assignments)는 student_id 로 academy_students.id 를 쓴다
 * (profiles.id 와 다름). 같은 규칙: id → user_id → profile_id.
 */
export async function resolveAcademyStudentId(userId: string): Promise<string | null> {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return null;
  const db = getServiceSupabase();
  const { data } = await db.from("academy_students").select("id").or(`id.eq.${userId},user_id.eq.${userId},profile_id.eq.${userId}`).limit(1).maybeSingle();
  return data?.id ? String(data.id) : null;
}

/** (학생, 날짜, 종류)로 항상 같은 UUID를 만든다 — "하루에 한 번만 적립"을 DB 유니크 인덱스로 보장하기 위한 참조 ID */
export function dayRefId(studentId: string, day: string, kind: string): string {
  const h = createHash("sha1").update(`${studentId}|${day}|${kind}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

/**
 * 단어 숙제(Day) 완료 직후 호출: 오늘 완료한 Day 수가 하루 목표(plan.sets_per_day, 기본 1)에 도달하면
 * 플레이 시간을 적립한다. 하루에 한 번만(중복은 DB가 막는다). 실패해도 숙제 완료 자체에는 영향이 없도록 호출 쪽에서 try/catch.
 * ※ 지금은 단어 숙제만 "오늘 숙제"로 센다. 다른 숙제 종류는 이후 연동.
 */
export async function awardHomeworkDoneIfComplete(opts: { userId: string; academyStudentId: string; trackId: string | null }): Promise<{ granted: boolean; minutes?: number; reason?: string }> {
  const db = getServiceSupabase();
  const day = kstToday();
  const startIso = new Date(`${day}T00:00:00+09:00`).toISOString();

  let perDay = 1;
  if (opts.trackId) {
    const { data: plan } = await db.from("student_vocab_plans").select("sets_per_day").eq("student_id", opts.academyStudentId).eq("track_id", opts.trackId).maybeSingle();
    perDay = Math.max(1, Number((plan as { sets_per_day?: number } | null)?.sets_per_day) || 1);
  }

  const { count } = await db.from("student_vocab_assignments").select("id", { count: "exact", head: true }).eq("student_id", opts.academyStudentId).gte("completed_at", startIso);
  if ((count ?? 0) < perDay) return { granted: false, reason: `오늘 ${count ?? 0}/${perDay}개 완료` };

  const settings = await getPerkSettings();
  const g = await grantMinutes({
    studentId: opts.userId,
    minutes: settings.homework_minutes,
    reason: "homework_done",
    refType: "homework_day",
    refId: dayRefId(opts.userId, day, "homework_done"),
    day,
  });
  if ("error" in g) return { granted: false, reason: g.error };
  return { granted: !g.duplicate, minutes: settings.homework_minutes, reason: g.duplicate ? "이미 적립됨" : undefined };
}

/** 직원 역할 판별. */
export const STAFF_ROLES = ["admin", "teacher", "franchisee", "hq_staff"] as const;
export function isStaffRole(role: string | null | undefined): boolean {
  return !!role && (STAFF_ROLES as readonly string[]).includes(role);
}
