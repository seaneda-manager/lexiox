// apps/web/app/protected/admin/classes/actions.ts
"use server";

import { getServiceRoleClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/classes/requireStaff";
import { syncUpcomingSessions } from "@/lib/classes/syncSessions";
import { todayKST } from "@/lib/classes/dates";

export type ClassMeeting = {
  id: string;
  weekday: number; // 0=일 .. 6=토
  start_time: string; // HH:MM:SS
  duration_min: number;
  effective_from: string | null;
  effective_to: string | null;
};

export type ClassMember = { student_id: string; name: string; joined_on: string };

export type ClassRow = {
  id: string;
  name: string;
  notes: string | null;
  is_active: boolean;
  teacher_id: string | null;
  teacher_name: string | null;
  meetings: ClassMeeting[];
  members: ClassMember[];
  session_count: number;
};

export type PersonOption = { id: string; name: string };

// strict 모드가 아닌 프로젝트 설정에서도 안전하게 좁혀지도록 단순한 형태로 둔다. 실패면 ok=false + error.
export type Result<T = {}> = { ok: boolean; error?: string } & Partial<T>;

function clean(s: unknown): string {
  return String(s ?? "").trim();
}

// 학원 날짜는 한국 시간 기준 (lib/classes/dates.ts)
const todayISO = todayKST;

function displayName(p: { full_name?: string | null; name?: string | null; email?: string | null }): string {
  return clean(p.full_name) || clean(p.name) || clean(p.email) || "(이름 없음)";
}

/** 반 목록 + 담당 교사 + 시간표 + 현재 소속 학생 */
export async function listClassesAction(): Promise<Result<{ classes: ClassRow[] }>> {
  try {
    const auth = await requireStaff();
    if (auth.error) return { ok: false, error: auth.error };
    const db = getServiceRoleClient();

    const { data: classes, error } = await db
      .from("academy_classes")
      .select("id, name, notes, is_active, teacher_id")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    const ids = (classes ?? []).map((c: any) => c.id);
    if (ids.length === 0) return { ok: true, classes: [] };

    const [meet, mem, sess] = await Promise.all([
      db
        .from("academy_class_meetings")
        .select("id, class_id, weekday, start_time, duration_min, effective_from, effective_to")
        .in("class_id", ids)
        .order("weekday", { ascending: true })
        .order("start_time", { ascending: true }),
      db.from("academy_class_students").select("class_id, student_id, joined_on, left_on").in("class_id", ids).is("left_on", null),
      db.from("class_sessions").select("class_id").in("class_id", ids),
    ]);
    if (meet.error) throw new Error(meet.error.message);
    if (mem.error) throw new Error(mem.error.message);
    if (sess.error) throw new Error(sess.error.message);

    const personIds = new Set<string>();
    for (const m of mem.data ?? []) personIds.add((m as any).student_id);
    for (const c of classes ?? []) if ((c as any).teacher_id) personIds.add((c as any).teacher_id);
    const names = new Map<string, string>();
    if (personIds.size > 0) {
      const { data: people, error: pErr } = await db
        .from("profiles")
        .select("id, full_name, name, email")
        .in("id", Array.from(personIds));
      if (pErr) throw new Error(pErr.message);
      for (const p of people ?? []) names.set((p as any).id, displayName(p as any));
    }

    const sessionCount = new Map<string, number>();
    for (const s of sess.data ?? []) {
      const k = (s as any).class_id as string;
      sessionCount.set(k, (sessionCount.get(k) ?? 0) + 1);
    }

    const rows: ClassRow[] = (classes ?? []).map((c: any) => ({
      id: c.id,
      name: c.name,
      notes: c.notes ?? null,
      is_active: c.is_active ?? true,
      teacher_id: c.teacher_id ?? null,
      teacher_name: c.teacher_id ? names.get(c.teacher_id) ?? null : null,
      meetings: (meet.data ?? [])
        .filter((m: any) => m.class_id === c.id)
        .map((m: any) => ({
          id: m.id,
          weekday: m.weekday,
          start_time: m.start_time,
          duration_min: m.duration_min,
          effective_from: m.effective_from ?? null,
          effective_to: m.effective_to ?? null,
        })),
      members: (mem.data ?? [])
        .filter((m: any) => m.class_id === c.id)
        .map((m: any) => ({
          student_id: m.student_id,
          name: names.get(m.student_id) ?? "(이름 없음)",
          joined_on: m.joined_on,
        }))
        .sort((a: ClassMember, b: ClassMember) => a.name.localeCompare(b.name, "ko")),
      session_count: sessionCount.get(c.id) ?? 0,
    }));

    return { ok: true, classes: rows };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "반 목록 조회 실패" };
  }
}

/** 담당 교사로 지정할 수 있는 사람(교사/관리자) */
export async function listTeacherOptionsAction(): Promise<Result<{ teachers: PersonOption[] }>> {
  try {
    const auth = await requireStaff();
    if (auth.error) return { ok: false, error: auth.error };
    const db = getServiceRoleClient();
    const { data, error } = await db
      .from("profiles")
      .select("id, full_name, name, email")
      .in("role", ["admin", "teacher"]);
    if (error) throw new Error(error.message);
    const teachers = (data ?? [])
      .map((p: any) => ({ id: p.id as string, name: displayName(p) }))
      .sort((a, b) => a.name.localeCompare(b.name, "ko"));
    return { ok: true, teachers };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "교사 목록 조회 실패" };
  }
}

/** 반에 넣을 수 있는 학생(활성 학생 계정) */
export async function listStudentOptionsAction(): Promise<Result<{ students: PersonOption[] }>> {
  try {
    const auth = await requireStaff();
    if (auth.error) return { ok: false, error: auth.error };
    const db = getServiceRoleClient();
    const { data, error } = await db
      .from("profiles")
      .select("id, full_name, name, email, is_active")
      .eq("role", "student");
    if (error) throw new Error(error.message);
    const students = (data ?? [])
      .filter((p: any) => p.is_active !== false)
      .map((p: any) => ({ id: p.id as string, name: displayName(p) }))
      .sort((a, b) => a.name.localeCompare(b.name, "ko"));
    return { ok: true, students };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "학생 목록 조회 실패" };
  }
}

export async function createClassAction(params: {
  name: string;
  teacherId?: string | null;
  notes?: string;
}): Promise<Result<{ id: string }>> {
  try {
    const auth = await requireStaff();
    if (auth.error) return { ok: false, error: auth.error };
    const name = clean(params.name);
    if (!name) return { ok: false, error: "반 이름을 입력하세요." };
    const db = getServiceRoleClient();
    const { data, error } = await db
      .from("academy_classes")
      .insert({
        name,
        teacher_id: params.teacherId || null,
        notes: clean(params.notes) || null,
        created_by: auth.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: data.id };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "반 생성 실패" };
  }
}

export async function updateClassAction(params: {
  id: string;
  name?: string;
  teacherId?: string | null;
  isActive?: boolean;
  notes?: string | null;
}): Promise<Result> {
  try {
    const auth = await requireStaff();
    if (auth.error) return { ok: false, error: auth.error };
    const patch: Record<string, unknown> = {};
    if (params.name !== undefined) {
      const name = clean(params.name);
      if (!name) return { ok: false, error: "반 이름을 입력하세요." };
      patch.name = name;
    }
    if (params.teacherId !== undefined) patch.teacher_id = params.teacherId || null;
    if (params.isActive !== undefined) patch.is_active = params.isActive;
    if (params.notes !== undefined) patch.notes = clean(params.notes) || null;
    if (Object.keys(patch).length === 0) return { ok: true };

    const db = getServiceRoleClient();
    const { error } = await db.from("academy_classes").update(patch).eq("id", params.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "반 수정 실패" };
  }
}

/**
 * 반 삭제: 수업 기록(회차/출석)이 한 번이라도 있으면 막는다.
 * (삭제하면 회차·출석 기록이 연쇄 삭제되므로, 그런 반은 '비활성'으로 보관한다.)
 */
export async function deleteClassAction(params: { id: string }): Promise<Result> {
  try {
    const auth = await requireStaff();
    if (auth.error) return { ok: false, error: auth.error };
    const db = getServiceRoleClient();
    const { count, error: cErr } = await db
      .from("class_sessions")
      .select("id", { count: "exact", head: true })
      .eq("class_id", params.id);
    if (cErr) throw new Error(cErr.message);
    if ((count ?? 0) > 0) {
      return { ok: false, error: "수업 기록이 있는 반은 삭제할 수 없습니다. '비활성'으로 바꿔 보관하세요." };
    }
    const { error } = await db.from("academy_classes").delete().eq("id", params.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "반 삭제 실패" };
  }
}

export async function addMeetingAction(params: {
  classId: string;
  weekday: number;
  startTime: string;
  durationMin: number;
}): Promise<Result> {
  try {
    const auth = await requireStaff();
    if (auth.error) return { ok: false, error: auth.error };
    if (!Number.isInteger(params.weekday) || params.weekday < 0 || params.weekday > 6) {
      return { ok: false, error: "요일이 올바르지 않습니다." };
    }
    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(params.startTime)) return { ok: false, error: "시작 시간을 입력하세요." };
    if (!(params.durationMin > 0 && params.durationMin <= 600)) {
      return { ok: false, error: "수업 시간(분)이 올바르지 않습니다." };
    }
    const db = getServiceRoleClient();
    const { error } = await db.from("academy_class_meetings").insert({
      class_id: params.classId,
      weekday: params.weekday,
      start_time: params.startTime.length === 5 ? `${params.startTime}:00` : params.startTime,
      duration_min: params.durationMin,
      effective_from: todayISO(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "시간표 추가 실패" };
  }
}

/**
 * 시간표 삭제: 이미 만든 수업 회차는 그대로 둔다(과거 기록 보존).
 * 앞으로 회차가 더 만들어지지 않도록 템플릿만 지운다.
 */
export async function deleteMeetingAction(params: { id: string }): Promise<Result> {
  try {
    const auth = await requireStaff();
    if (auth.error) return { ok: false, error: auth.error };
    const db = getServiceRoleClient();
    const { error } = await db.from("academy_class_meetings").delete().eq("id", params.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "시간표 삭제 실패" };
  }
}

/** 반에 학생 넣기. 이전에 나간 학생이면 다시 입반(left_on 해제). */
export async function enrollStudentAction(params: { classId: string; studentId: string }): Promise<Result> {
  try {
    const auth = await requireStaff();
    if (auth.error) return { ok: false, error: auth.error };
    const db = getServiceRoleClient();
    const { error } = await db
      .from("academy_class_students")
      .upsert(
        { class_id: params.classId, student_id: params.studentId, joined_on: todayISO(), left_on: null },
        { onConflict: "class_id,student_id" }
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "학생 배정 실패" };
  }
}

/** 반에서 빼기: 행을 지우지 않고 left_on 만 기록(과거 출석의 반 소속 맥락 보존). */
export async function unenrollStudentAction(params: { classId: string; studentId: string }): Promise<Result> {
  try {
    const auth = await requireStaff();
    if (auth.error) return { ok: false, error: auth.error };
    const db = getServiceRoleClient();
    const { error } = await db
      .from("academy_class_students")
      .update({ left_on: todayISO() })
      .eq("class_id", params.classId)
      .eq("student_id", params.studentId);
    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "학생 제외 실패" };
  }
}

/**
 * 활성 반들의 시간표로 앞으로 N일치 수업 회차를 만든다. 여러 번 눌러도 중복 생성되지 않는다.
 * (unique(class_id, session_date, start_time) + generateSessions 의 existing 필터)
 */
export async function generateUpcomingSessionsAction(params: {
  days?: number;
}): Promise<Result<{ created: number; classes: number }>> {
  try {
    const auth = await requireStaff();
    if (auth.error) return { ok: false, error: auth.error };
    const result = await syncUpcomingSessions(getServiceRoleClient(), { days: params.days });
    return { ok: true, ...result };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "수업 회차 생성 실패" };
  }
}
