"use server";

import { getServerSupabase, getServiceRoleClient } from "@/lib/supabase/server";

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
    const supabase = getServiceRoleClient();
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
    const supabase = getServiceRoleClient();
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
  weekdays?: number[];
  startDay?: number;
}) {
  try {
    const supabase = getServiceRoleClient();

    const today = new Date();
    const startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    // 기본값: 주 2회 (월, 수요일)
    const weekdaysToUse = params.weekdays && params.weekdays.length > 0
      ? params.weekdays
      : [1, 3]; // 월(1), 수(3)

    const startDayIndex = params.startDay || 1;

    const { error: perr } = await supabase
      .from("student_vocab_plans")
      .upsert({
        student_id: params.studentId,
        track_id: params.trackId,
        start_date: startDate,
        weekdays: weekdaysToUse,
        max_active_sets: 2,
        is_enabled: true,
        start_day_index: startDayIndex,
        cursor_day_index: startDayIndex,
        is_paused: false,
        paused_reason: null,
      } as any, { onConflict: "student_id,track_id" });

    if (perr) throw new Error(perr.message);

    // Get track total days
    const { data: track, error: trackErr } = await supabase
      .from("vocab_tracks")
      .select("total_days")
      .eq("id", params.trackId)
      .single();

    if (trackErr || !track?.total_days) throw new Error("Track not found");

    const totalDays = track.total_days;

    // Create or update all assignments for this student
    const assignmentIds: string[] = [];
    for (let dayIndex = 1; dayIndex <= totalDays; dayIndex++) {
      const { data: existing } = await supabase
        .from("student_vocab_assignments")
        .select("id")
        .eq("student_id", params.studentId)
        .eq("track_id", params.trackId)
        .eq("day_index", dayIndex)
        .single();

      if (!existing) {
        // Create new assignment
        const { data: newAssign, error: insertErr } = await supabase
          .from("student_vocab_assignments")
          .insert({
            student_id: params.studentId,
            track_id: params.trackId,
            day_index: dayIndex,
            status: "ASSIGNED",
          } as any)
          .select("id")
          .single();

        if (!insertErr && newAssign?.id) {
          assignmentIds.push(newAssign.id);
        }
      } else {
        assignmentIds.push(existing.id);
      }
    }

    // Update available_at for all assignments
    const { data: allAssignments, error: fetchErr } = await supabase
      .from("student_vocab_assignments")
      .select("id, day_index")
      .eq("student_id", params.studentId)
      .eq("track_id", params.trackId);

    if (fetchErr) throw new Error(fetchErr.message);

    for (const assignment of allAssignments || []) {
      const { data: newDate, error: calcErr } = await supabase.rpc(
        "calculate_available_date",
        {
          p_start_date: startDate,
          p_weekdays: weekdaysToUse,
          p_day_index: assignment.day_index,
        }
      );

      if (!calcErr && newDate) {
        await supabase
          .from("student_vocab_assignments")
          .update({ available_at: newDate } as any)
          .eq("id", assignment.id);
      }
    }

    return { ok: true, queueSize: totalDays };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "failed" };
  }
}

export async function updateAssignmentDayAction(params: {
  assignmentId: string;
  newDayIndex: number;
}) {
  try {
    const supabase = getServiceRoleClient();

    // Get current assignment to find its student and plan
    const { data: assignment, error: fetchErr } = await supabase
      .from("student_vocab_assignments")
      .select("student_id, track_id")
      .eq("id", params.assignmentId)
      .single();

    if (fetchErr) throw new Error(fetchErr.message);

    // Get student plan to access start_date and weekdays
    const { data: plan, error: planErr } = await supabase
      .from("student_vocab_plans")
      .select("start_date, weekdays")
      .eq("student_id", assignment.student_id)
      .eq("track_id", assignment.track_id)
      .single();

    if (planErr) throw new Error(planErr.message);

    // Calculate new available_at using weekdays
    const { data: dateResult, error: dateErr } = await supabase.rpc(
      "calculate_available_date",
      {
        p_start_date: plan.start_date,
        p_weekdays: plan.weekdays || [1, 2, 3, 4, 5],
        p_day_index: params.newDayIndex,
      }
    );

    if (dateErr) throw new Error(dateErr.message);

    // Update both day_index and available_at
    const { error: updateErr } = await supabase
      .from("student_vocab_assignments")
      .update({
        day_index: params.newDayIndex,
        available_at: dateResult,
      } as any)
      .eq("id", params.assignmentId);

    if (updateErr) throw new Error(updateErr.message);

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
    const supabase = getServiceRoleClient();

    // Get student plan to check start_day_index
    const { data: plan, error: planErr } = await supabase
      .from("student_vocab_plans")
      .select("start_day_index")
      .eq("student_id", params.studentId)
      .eq("track_id", params.trackId)
      .single();

    const startDayIndex = plan?.start_day_index ?? 1;

    const { data, error } = await supabase
      .from("student_vocab_assignments")
      .select("id, day_index, status, available_at, started_at, completed_at")
      .eq("student_id", params.studentId)
      .eq("track_id", params.trackId)
      .is("completed_at", null)
      .gte("day_index", startDayIndex)
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
    const supabase = getServiceRoleClient();

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
    const supabase = getServiceRoleClient();

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
    const supabase = getServiceRoleClient();

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

export async function updateAssignmentAvailableDateAction(params: {
  assignmentId: string;
  newAvailableAt: string; // YYYY-MM-DD format
}) {
  try {
    const supabase = getServiceRoleClient();

    const { error } = await supabase
      .from("student_vocab_assignments")
      .update({ available_at: params.newAvailableAt } as any)
      .eq("id", params.assignmentId);

    if (error) throw new Error(error.message);

    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "failed" };
  }
}

export async function markAssignmentCompletedAction(params: {
  assignmentId: string;
}) {
  try {
    const supabase = getServiceRoleClient();

    const { error } = await supabase
      .from("student_vocab_assignments")
      .update({
        completed_at: new Date().toISOString(),
        status: "COMPLETED",
      } as any)
      .eq("id", params.assignmentId);

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
