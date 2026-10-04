// apps/web/app/protected/admin/attendance/actions.ts
"use server";

import { getServiceRoleClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/classes/requireStaff";
import { isISODate, todayKST } from "@/lib/classes/dates";
import { isMemberOn, summarizeAttendance, type AttendanceStatus, type AttendanceSummary } from "@/lib/classes/sessionBoard";

export type DaySession = {
  id: string;
  class_name: string;
  teacher_name: string | null;
  start_time: string;
  duration_min: number;
  status: string;
  summary: AttendanceSummary;
};

export type DayException = {
  session_id: string;
  class_name: string;
  start_time: string;
  student_name: string;
  status: AttendanceStatus; // late | absent | excused
  note: string | null;
};

export type DayOverview = {
  date: string;
  sessions: DaySession[];
  exceptions: DayException[];
  totals: { students: number; present: number; late: number; absent: number; excused: number; unchecked: number };
  uncheckedSessions: number;
};

type Result<T = {}> = { ok: boolean; error?: string } & Partial<T>;

function clean(s: unknown): string {
  return String(s ?? "").trim();
}

function displayName(p: { full_name?: string | null; name?: string | null; email?: string | null }): string {
  return clean(p.full_name) || clean(p.name) || clean(p.email) || "(이름 없음)";
}

/** 원장용 하루 현황: 반별 체크 여부 + 지각/결석 학생 목록 + 합계 (휴강 수업은 제외) */
export async function getDayOverviewAction(params: { date?: string }): Promise<Result<{ overview: DayOverview }>> {
  try {
    const auth = await requireStaff();
    if (auth.error) return { ok: false, error: auth.error };
    const date = isISODate(params.date) ? params.date : todayKST();
    const db = getServiceRoleClient();

    const { data: sessionsRaw, error } = await db
      .from("class_sessions")
      .select("id, class_id, start_time, duration_min, status")
      .eq("session_date", date)
      .order("start_time", { ascending: true });
    if (error) throw new Error(error.message);

    const empty: DayOverview = {
      date,
      sessions: [],
      exceptions: [],
      totals: { students: 0, present: 0, late: 0, absent: 0, excused: 0, unchecked: 0 },
      uncheckedSessions: 0,
    };
    if (!sessionsRaw || sessionsRaw.length === 0) return { ok: true, overview: empty };

    const sessions = sessionsRaw as any[];
    const classIds = Array.from(new Set(sessions.map((s) => s.class_id as string)));
    const sessionIds = sessions.map((s) => s.id as string);

    const [cls, mem, att] = await Promise.all([
      db.from("academy_classes").select("id, name, teacher_id").in("id", classIds),
      db.from("academy_class_students").select("class_id, student_id, joined_on, left_on").in("class_id", classIds),
      db.from("attendance_records").select("session_id, student_id, status, note").in("session_id", sessionIds),
    ]);
    if (cls.error) throw new Error(cls.error.message);
    if (mem.error) throw new Error(mem.error.message);
    if (att.error) throw new Error(att.error.message);

    const personIds = new Set<string>();
    for (const m of mem.data ?? []) personIds.add((m as any).student_id);
    for (const c of cls.data ?? []) if ((c as any).teacher_id) personIds.add((c as any).teacher_id);
    const names = new Map<string, string>();
    if (personIds.size > 0) {
      const { data: people, error: pErr } = await db
        .from("profiles")
        .select("id, full_name, name, email")
        .in("id", Array.from(personIds));
      if (pErr) throw new Error(pErr.message);
      for (const p of people ?? []) names.set((p as any).id, displayName(p as any));
    }

    const overview: DayOverview = { ...empty, sessions: [], exceptions: [] };

    for (const s of sessions) {
      const c = (cls.data ?? []).find((x: any) => x.id === s.class_id) as any;
      const className = c?.name ?? "(삭제된 반)";
      const memberIds = (mem.data ?? [])
        .filter((m: any) => m.class_id === s.class_id && isMemberOn(date, m.joined_on, m.left_on))
        .map((m: any) => m.student_id as string);
      const records = (att.data ?? []).filter((a: any) => a.session_id === s.id) as {
        student_id: string;
        status: AttendanceStatus;
        note: string | null;
      }[];
      const summary = summarizeAttendance(memberIds, records);

      overview.sessions.push({
        id: s.id,
        class_name: className,
        teacher_name: c?.teacher_id ? names.get(c.teacher_id) ?? null : null,
        start_time: s.start_time,
        duration_min: s.duration_min,
        status: s.status,
        summary,
      });

      if (s.status === "cancelled") continue; // 휴강은 합계와 미체크 계산에서 제외

      overview.totals.students += summary.total;
      overview.totals.present += summary.present;
      overview.totals.late += summary.late;
      overview.totals.absent += summary.absent;
      overview.totals.excused += summary.excused;
      overview.totals.unchecked += summary.unchecked;
      if (summary.total > 0 && summary.unchecked > 0) overview.uncheckedSessions += 1;

      for (const r of records) {
        if (!memberIds.includes(r.student_id)) continue;
        if (r.status === "present") continue;
        overview.exceptions.push({
          session_id: s.id,
          class_name: className,
          start_time: s.start_time,
          student_name: names.get(r.student_id) ?? "(이름 없음)",
          status: r.status,
          note: r.note ?? null,
        });
      }
    }

    const order: Record<string, number> = { absent: 0, late: 1, excused: 2 };
    overview.exceptions.sort(
      (a, b) =>
        (order[a.status] ?? 9) - (order[b.status] ?? 9) ||
        a.start_time.localeCompare(b.start_time) ||
        a.student_name.localeCompare(b.student_name, "ko")
    );

    return { ok: true, overview };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "출석 현황 조회 실패" };
  }
}
