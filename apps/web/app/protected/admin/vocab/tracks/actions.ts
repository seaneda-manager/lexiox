"use server";

import { getServerSupabase } from "@/lib/supabase/server";

type StudentLite = {
  id: string;
  full_name: string | null;
  login_id: string | null;
  grade: string | null;
};

type TrackLite = {
  id: string;
  title: string | null;
  slug: string | null;
  total_days: number | null;
};

export async function listStudentsAction() {
  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from("academy_students")
      .select("id, full_name, login_id, grade")
      .eq("is_active", true)
      .order("grade")
      .order("full_name")
      .limit(1000);

    if (error) return { ok: false, error: error.message };
    return { ok: true, students: data as StudentLite[] };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "failed" };
  }
}

export async function listTracksAction() {
  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from("vocab_tracks")
      .select("id, title, slug, total_days")
      .order("created_at", { ascending: false });

    if (error) return { ok: false, error: error.message };
    return { ok: true, tracks: data as TrackLite[] };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "failed" };
  }
}

export async function assignStudentAction(params: {
  studentId: string;
  trackId: string;
}) {
  try {
    const supabase = await getServerSupabase();

    const today = new Date();
    const startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    // 기본값: 월-금, 2개 동시 활성
    const { error: perr } = await supabase
      .from("student_vocab_plans")
      .upsert({
        student_id: params.studentId,
        track_id: params.trackId,
        start_date: startDate,
        weekdays: [1, 2, 3, 4, 5], // 월-금
        max_active_sets: 2,
        is_enabled: true,
        start_day_index: 1,
        cursor_day_index: 1,
        is_paused: false,
        paused_reason: null,
      } as any, { onConflict: "student_id,track_id" });

    if (perr) throw new Error(perr.message);

    // 큐 생성
    const { data: queue, error: qerr } = await supabase
      .from("student_vocab_assignments")
      .select("id")
      .eq("student_id", params.studentId)
      .eq("track_id", params.trackId)
      .is("completed_at", null);

    if (qerr) throw new Error(qerr.message);

    return { ok: true, queueSize: queue?.length ?? 0 };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "failed" };
  }
}

export async function updateAssignmentDayAction(params: {
  assignmentId: string;
  newDayIndex: number;
}) {
  try {
    const supabase = await getServerSupabase();

    const { error } = await supabase
      .from("student_vocab_assignments")
      .update({ day_index: params.newDayIndex } as any)
      .eq("id", params.assignmentId);

    if (error) throw new Error(error.message);

    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "failed" };
  }
}

export async function getStudentQueueAction(params: {
  studentId: string;
  trackId: string;
}) {
  try {
    const supabase = await getServerSupabase();

    const { data, error } = await supabase
      .from("student_vocab_assignments")
      .select("id, day_index, status, available_at, started_at, completed_at")
      .eq("student_id", params.studentId)
      .eq("track_id", params.trackId)
      .is("completed_at", null)
      .order("day_index");

    if (error) throw new Error(error.message);

    return { ok: true, queue: data ?? [] };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "failed" };
  }
}

type Notice = {
  id: string;
  student_id: string;
  assignment_id: string;
  track_id: string;
  day_index: number;
  notice_type: string;
  status: string;
  created_at: string;
};

export async function getStudentNoticesAction(params: {
  studentId: string;
}) {
  try {
    const supabase = await getServerSupabase();

    const { data, error } = await supabase
      .from("vocab_assignment_notices")
      .select("id, student_id, assignment_id, track_id, day_index, notice_type, status, created_at")
      .eq("student_id", params.studentId)
      .eq("status", "unread")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return { ok: true, notices: data as Notice[] };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "failed" };
  }
}

export async function markNoticeReadAction(params: {
  noticeId: string;
}) {
  try {
    const supabase = await getServerSupabase();

    const { error } = await supabase
      .from("vocab_assignment_notices")
      .update({ status: "read", read_at: new Date().toISOString() })
      .eq("id", params.noticeId);

    if (error) throw new Error(error.message);

    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "failed" };
  }
}

export async function dismissNoticeAction(params: {
  noticeId: string;
}) {
  try {
    const supabase = await getServerSupabase();

    const { error } = await supabase
      .from("vocab_assignment_notices")
      .update({ status: "dismissed", dismissed_at: new Date().toISOString() })
      .eq("id", params.noticeId);

    if (error) throw new Error(error.message);

    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "failed" };
  }
}

export async function createOverdueNoticesAction() {
  try {
    const supabase = await getServerSupabase();

    const { data, error } = await supabase.rpc("create_overdue_assignment_notices");

    if (error) throw new Error(error.message);

    return { ok: true, created: data?.[0]?.created_count ?? 0 };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "failed" };
  }
}
