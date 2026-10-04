// apps/web/app/protected/teacher/session/actions.ts
"use server";

import { getServiceRoleClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/classes/requireStaff";
import { todayKST, isISODate } from "@/lib/classes/dates";
import { makeAttendanceDedupeKey } from "@/lib/notifications/attendanceMessage";
import { noticeKindForStatus } from "@/lib/notifications/guardianPick";
import {
  isMemberOn,
  summarizeAttendance,
  type AttendanceStatus,
  type AttendanceSummary,
  type StepProgress,
} from "@/lib/classes/sessionBoard";

export type Result<T = {}> = { ok: boolean; error?: string } & Partial<T>;

export type SessionListItem = {
  id: string;
  class_id: string;
  class_name: string;
  teacher_name: string | null;
  is_mine: boolean;
  start_time: string; // HH:MM:SS
  duration_min: number;
  kind: string;
  status: string;
  summary: AttendanceSummary;
};

export type FlowStep = { step_key: string; label: string; position: number };

export type BoardStudent = {
  student_id: string;
  name: string;
  attendance: AttendanceStatus | null;
  note: string | null;
  steps: StepProgress; // step_key -> { done_at }
};

export type SessionBoard = {
  session: {
    id: string;
    class_id: string;
    class_name: string;
    session_date: string;
    start_time: string;
    duration_min: number;
    kind: string;
    status: string;
    cancel_reason: string | null;
  };
  flow: FlowStep[];
  students: BoardStudent[];
};

const STATUSES: AttendanceStatus[] = ["present", "late", "absent", "excused"];

function clean(s: unknown): string {
  return String(s ?? "").trim();
}

function displayName(p: { full_name?: string | null; name?: string | null; email?: string | null }): string {
  return clean(p.full_name) || clean(p.name) || clean(p.email) || "(이름 없음)";
}

/** 하루의 수업 목록 (기본: 오늘, 한국 시간) + 출석 체크 현황 */
export async function listSessionsForDateAction(params: { date?: string }): Promise<Result<{ date: string; sessions: SessionListItem[] }>> {
  try {
    const auth = await requireStaff();
    if (auth.error) return { ok: false, error: auth.error };
    const date = isISODate(params.date) ? params.date : todayKST();
    const db = getServiceRoleClient();

    const { data: sessions, error } = await db
      .from("class_sessions")
      .select("id, class_id, start_time, duration_min, kind, status")
      .eq("session_date", date)
      .order("start_time", { ascending: true });
    if (error) throw new Error(error.message);
    if (!sessions || sessions.length === 0) return { ok: true, date, sessions: [] };

    const classIds = Array.from(new Set(sessions.map((s: any) => s.class_id as string)));
    const sessionIds = sessions.map((s: any) => s.id as string);

    const [cls, mem, att] = await Promise.all([
      db.from("academy_classes").select("id, name, teacher_id").in("id", classIds),
      db.from("academy_class_students").select("class_id, student_id, joined_on, left_on").in("class_id", classIds),
      db.from("attendance_records").select("session_id, student_id, status").in("session_id", sessionIds),
    ]);
    if (cls.error) throw new Error(cls.error.message);
    if (mem.error) throw new Error(mem.error.message);
    if (att.error) throw new Error(att.error.message);

    const teacherIds = Array.from(new Set((cls.data ?? []).map((c: any) => c.teacher_id).filter(Boolean))) as string[];
    const teacherNames = new Map<string, string>();
    if (teacherIds.length > 0) {
      const { data: t } = await db.from("profiles").select("id, full_name, name, email").in("id", teacherIds);
      for (const p of t ?? []) teacherNames.set((p as any).id, displayName(p as any));
    }

    const items: SessionListItem[] = sessions.map((s: any) => {
      const c = (cls.data ?? []).find((x: any) => x.id === s.class_id) as any;
      const memberIds = (mem.data ?? [])
        .filter((m: any) => m.class_id === s.class_id && isMemberOn(date, m.joined_on, m.left_on))
        .map((m: any) => m.student_id as string);
      const records = (att.data ?? []).filter((a: any) => a.session_id === s.id) as { student_id: string; status: AttendanceStatus }[];
      return {
        id: s.id,
        class_id: s.class_id,
        class_name: c?.name ?? "(삭제된 반)",
        teacher_name: c?.teacher_id ? teacherNames.get(c.teacher_id) ?? null : null,
        is_mine: !!c?.teacher_id && c.teacher_id === auth.userId,
        start_time: s.start_time,
        duration_min: s.duration_min,
        kind: s.kind,
        status: s.status,
        summary: summarizeAttendance(memberIds, records),
      };
    });

    return { ok: true, date, sessions: items };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "수업 목록 조회 실패" };
  }
}

/** 수업 진행 보드 데이터: 그 날짜 기준 소속 학생 × (출석 + 단계 진행) */
export async function getSessionBoardAction(params: { sessionId: string }): Promise<Result<{ board: SessionBoard }>> {
  try {
    const auth = await requireStaff();
    if (auth.error) return { ok: false, error: auth.error };
    const db = getServiceRoleClient();

    const { data: s, error } = await db
      .from("class_sessions")
      .select("id, class_id, session_date, start_time, duration_min, kind, status, cancel_reason")
      .eq("id", params.sessionId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!s) return { ok: false, error: "수업을 찾을 수 없습니다." };

    const { data: cls, error: cErr } = await db
      .from("academy_classes")
      .select("id, name, org_id, flow_key")
      .eq("id", (s as any).class_id)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);

    const flowKey = (cls as any)?.flow_key || "default";
    const orgId = (cls as any)?.org_id ?? null;

    const [stepDefs, mem, att, prog] = await Promise.all([
      db.from("session_flow_steps").select("org_id, step_key, label, position").eq("flow_key", flowKey),
      db.from("academy_class_students").select("student_id, joined_on, left_on").eq("class_id", (s as any).class_id),
      db.from("attendance_records").select("student_id, status, note").eq("session_id", params.sessionId),
      db.from("session_student_steps").select("student_id, step_key, done_at").eq("session_id", params.sessionId),
    ]);
    if (stepDefs.error) throw new Error(stepDefs.error.message);
    if (mem.error) throw new Error(mem.error.message);
    if (att.error) throw new Error(att.error.message);
    if (prog.error) throw new Error(prog.error.message);

    // 학원(org) 전용 정의가 있으면 그것을, 없으면 기본(org_id null) 정의를 쓴다.
    const byKey = new Map<string, FlowStep & { specific: boolean }>();
    for (const d of stepDefs.data ?? []) {
      const row = d as any;
      if (row.org_id !== null && row.org_id !== orgId) continue;
      const specific = row.org_id !== null;
      const prev = byKey.get(row.step_key);
      if (!prev || (specific && !prev.specific)) {
        byKey.set(row.step_key, { step_key: row.step_key, label: row.label, position: row.position, specific });
      }
    }
    const flow: FlowStep[] = Array.from(byKey.values())
      .sort((a, b) => a.position - b.position)
      .map(({ step_key, label, position }) => ({ step_key, label, position }));

    const date = (s as any).session_date as string;
    const memberIds = (mem.data ?? [])
      .filter((m: any) => isMemberOn(date, m.joined_on, m.left_on))
      .map((m: any) => m.student_id as string);

    const names = new Map<string, string>();
    if (memberIds.length > 0) {
      const { data: people, error: pErr } = await db.from("profiles").select("id, full_name, name, email").in("id", memberIds);
      if (pErr) throw new Error(pErr.message);
      for (const p of people ?? []) names.set((p as any).id, displayName(p as any));
    }

    const attMap = new Map<string, { status: AttendanceStatus; note: string | null }>();
    for (const a of att.data ?? []) attMap.set((a as any).student_id, { status: (a as any).status, note: (a as any).note ?? null });

    const stepMap = new Map<string, StepProgress>();
    for (const p of prog.data ?? []) {
      const row = p as any;
      const cur = stepMap.get(row.student_id) ?? {};
      cur[row.step_key] = { done_at: row.done_at ?? null };
      stepMap.set(row.student_id, cur);
    }

    const students: BoardStudent[] = memberIds
      .map((id) => ({
        student_id: id,
        name: names.get(id) ?? "(이름 없음)",
        attendance: attMap.get(id)?.status ?? null,
        note: attMap.get(id)?.note ?? null,
        steps: stepMap.get(id) ?? {},
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "ko"));

    return {
      ok: true,
      board: {
        session: {
          id: (s as any).id,
          class_id: (s as any).class_id,
          class_name: (cls as any)?.name ?? "(삭제된 반)",
          session_date: date,
          start_time: (s as any).start_time,
          duration_min: (s as any).duration_min,
          kind: (s as any).kind,
          status: (s as any).status,
          cancel_reason: (s as any).cancel_reason ?? null,
        },
        flow,
        students,
      },
    };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "수업 보드 조회 실패" };
  }
}

/** 이 수업 날짜 기준으로 그 반 소속인 학생인지 (임의 학생 ID 로 기록이 만들어지는 것을 막는다) */
async function assertMember(db: ReturnType<typeof getServiceRoleClient>, sessionId: string, studentId: string) {
  const { data: s } = await db.from("class_sessions").select("class_id, session_date, status").eq("id", sessionId).maybeSingle();
  if (!s) return { error: "수업을 찾을 수 없습니다." as string | null, session: null as any };
  const { data: m } = await db
    .from("academy_class_students")
    .select("joined_on, left_on")
    .eq("class_id", (s as any).class_id)
    .eq("student_id", studentId)
    .maybeSingle();
  if (!m || !isMemberOn((s as any).session_date, (m as any).joined_on, (m as any).left_on)) {
    return { error: "이 수업의 학생이 아닙니다." as string | null, session: s };
  }
  return { error: null as string | null, session: s };
}

async function markHeld(db: ReturnType<typeof getServiceRoleClient>, sessionId: string, current: string) {
  if (current === "scheduled") await db.from("class_sessions").update({ status: "held" }).eq("id", sessionId);
}

/** 학생 한 명의 출석 상태를 정한다(교사 확정). */
export async function setAttendanceAction(params: {
  sessionId: string;
  studentId: string;
  status: AttendanceStatus;
  note?: string | null;
}): Promise<Result> {
  try {
    const auth = await requireStaff();
    if (auth.error) return { ok: false, error: auth.error };
    if (!STATUSES.includes(params.status)) return { ok: false, error: "출석 상태가 올바르지 않습니다." };

    const db = getServiceRoleClient();
    const chk = await assertMember(db, params.sessionId, params.studentId);
    if (chk.error) return { ok: false, error: chk.error };
    if (chk.session.status === "cancelled") return { ok: false, error: "휴강 처리된 수업입니다." };

    // 기존 출석 상태 (상태가 바뀌면 이미 만든 학부모 안내 초안을 정리하기 위해)
    const { data: prevRec } = await db
      .from("attendance_records")
      .select("status")
      .eq("session_id", params.sessionId)
      .eq("student_id", params.studentId)
      .maybeSingle();

    const { error } = await db.from("attendance_records").upsert(
      {
        session_id: params.sessionId,
        student_id: params.studentId,
        status: params.status,
        note: params.note === undefined ? undefined : clean(params.note) || null,
        marked_by: auth.userId,
        marked_at: new Date().toISOString(),
      },
      { onConflict: "session_id,student_id" }
    );
    if (error) throw new Error(error.message);

    // 결석/지각 → 다른 상태로 정정했다면, 아직 보내지 않은 이전 상태의 안내 초안은 취소한다.
    // (이미 '보냄' 처리된 안내는 건드리지 않는다. 화면에서 이미 안내했음을 확인할 수 있다.)
    const prevKind = noticeKindForStatus((prevRec as any)?.status);
    if (prevKind && (prevRec as any).status !== params.status) {
      await db
        .from("notification_outbox")
        .update({ status: "cancelled" })
        .eq("dedupe_key", makeAttendanceDedupeKey(prevKind, params.sessionId, params.studentId))
        .in("status", ["draft", "approved", "failed"]);
    }

    await markHeld(db, params.sessionId, chk.session.status);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "출석 저장 실패" };
  }
}

/**
 * '전원 출석으로 확정': 아직 기록이 없는 학생만 출석으로 저장한다.
 * 이미 지각/결석으로 정한 학생은 건드리지 않는다.
 */
export async function confirmRemainingPresentAction(params: { sessionId: string }): Promise<Result<{ created: number }>> {
  try {
    const auth = await requireStaff();
    if (auth.error) return { ok: false, error: auth.error };
    const db = getServiceRoleClient();

    const { data: s } = await db.from("class_sessions").select("class_id, session_date, status").eq("id", params.sessionId).maybeSingle();
    if (!s) return { ok: false, error: "수업을 찾을 수 없습니다." };
    if ((s as any).status === "cancelled") return { ok: false, error: "휴강 처리된 수업입니다." };

    const [mem, att] = await Promise.all([
      db.from("academy_class_students").select("student_id, joined_on, left_on").eq("class_id", (s as any).class_id),
      db.from("attendance_records").select("student_id").eq("session_id", params.sessionId),
    ]);
    if (mem.error) throw new Error(mem.error.message);
    if (att.error) throw new Error(att.error.message);

    const have = new Set((att.data ?? []).map((a: any) => a.student_id as string));
    const missing = (mem.data ?? [])
      .filter((m: any) => isMemberOn((s as any).session_date, m.joined_on, m.left_on) && !have.has(m.student_id))
      .map((m: any) => m.student_id as string);

    if (missing.length > 0) {
      const now = new Date().toISOString();
      const { error } = await db.from("attendance_records").upsert(
        missing.map((student_id) => ({
          session_id: params.sessionId,
          student_id,
          status: "present",
          marked_by: auth.userId,
          marked_at: now,
        })),
        { onConflict: "session_id,student_id", ignoreDuplicates: true }
      );
      if (error) throw new Error(error.message);
    }
    await markHeld(db, params.sessionId, (s as any).status);
    return { ok: true, created: missing.length };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "출석 확정 실패" };
  }
}

/** 진행 단계 완료/되돌리기. 되돌려도 메모 보존을 위해 행은 남기고 done_at 만 비운다. */
export async function toggleStepAction(params: {
  sessionId: string;
  studentId: string;
  stepKey: string;
  done: boolean;
}): Promise<Result<{ done_at: string | null }>> {
  try {
    const auth = await requireStaff();
    if (auth.error) return { ok: false, error: auth.error };
    const db = getServiceRoleClient();

    const chk = await assertMember(db, params.sessionId, params.studentId);
    if (chk.error) return { ok: false, error: chk.error };
    if (chk.session.status === "cancelled") return { ok: false, error: "휴강 처리된 수업입니다." };

    // 이 반의 흐름에 실제로 존재하는 단계만 허용
    const { data: cls } = await db.from("academy_classes").select("org_id, flow_key").eq("id", chk.session.class_id).maybeSingle();
    const { data: defs, error: dErr } = await db
      .from("session_flow_steps")
      .select("org_id, step_key")
      .eq("flow_key", (cls as any)?.flow_key || "default")
      .eq("step_key", params.stepKey);
    if (dErr) throw new Error(dErr.message);
    const valid = (defs ?? []).some((d: any) => d.org_id === null || d.org_id === ((cls as any)?.org_id ?? null));
    if (!valid) return { ok: false, error: "이 반에 없는 단계입니다." };

    const done_at = params.done ? new Date().toISOString() : null;
    const { error } = await db.from("session_student_steps").upsert(
      {
        session_id: params.sessionId,
        student_id: params.studentId,
        step_key: params.stepKey,
        done_at,
        done_by: params.done ? auth.userId : null,
      },
      { onConflict: "session_id,student_id,step_key" }
    );
    if (error) throw new Error(error.message);
    await markHeld(db, params.sessionId, chk.session.status);
    return { ok: true, done_at };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "단계 저장 실패" };
  }
}

/** 휴강 처리 / 휴강 취소. 이미 기록된 출석은 건드리지 않는다. */
export async function setSessionCancelledAction(params: { sessionId: string; cancelled: boolean; reason?: string }): Promise<Result> {
  try {
    const auth = await requireStaff();
    if (auth.error) return { ok: false, error: auth.error };
    const db = getServiceRoleClient();
    const { error } = await db
      .from("class_sessions")
      .update(
        params.cancelled
          ? { status: "cancelled", cancel_reason: clean(params.reason) || null }
          : { status: "scheduled", cancel_reason: null }
      )
      .eq("id", params.sessionId);
    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "휴강 처리 실패" };
  }
}
