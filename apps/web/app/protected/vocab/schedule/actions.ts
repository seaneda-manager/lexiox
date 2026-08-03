"use server";

import { getServerSupabase } from "@/lib/supabase/server";

export type ScheduleEvent = {
  id: string;
  event_type: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  description: string | null;
  is_applied: boolean;
  created_at: string;
};

export async function createScheduleEventAction(params: {
  event_type: string;
  start_date: string;
  end_date: string;
  reason?: string;
  description?: string;
}) {
  try {
    const supabase = await getServerSupabase();

    // Get current student
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user?.id) throw new Error("Not authenticated");

    const { data: student, error: studentErr } = await supabase
      .from("academy_students")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (studentErr || !student?.id) throw new Error("Student not found");

    // Create schedule event
    const { data: event, error: createErr } = await supabase
      .from("student_schedule_events")
      .insert({
        student_id: student.id,
        event_type: params.event_type,
        start_date: params.start_date,
        end_date: params.end_date,
        reason: params.reason,
        description: params.description,
      })
      .select()
      .single();

    if (createErr) throw new Error(createErr.message);

    // Auto-apply shifts
    const { data: shiftResult, error: shiftErr } = await supabase.rpc(
      "shift_assignments_by_event",
      {
        p_student_id: student.id,
        p_start_date: params.start_date,
        p_end_date: params.end_date,
      }
    );

    if (shiftErr) throw new Error(shiftErr.message);

    // Mark as applied
    await supabase
      .from("student_schedule_events")
      .update({ is_applied: true })
      .eq("id", event.id);

    return {
      ok: true,
      event,
      shiftResult: {
        shifted_count: shiftResult?.[0]?.shifted_count ?? 0,
        affected_tracks: shiftResult?.[0]?.affected_tracks ?? [],
      },
    };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Failed" };
  }
}

export async function getStudentScheduleEventsAction() {
  try {
    const supabase = await getServerSupabase();

    // Get current student
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user?.id) throw new Error("Not authenticated");

    const { data: student, error: studentErr } = await supabase
      .from("academy_students")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (studentErr || !student?.id) throw new Error("Student not found");

    // Get all events
    const { data: events, error: eventsErr } = await supabase
      .from("student_schedule_events")
      .select("*")
      .eq("student_id", student.id)
      .order("start_date", { ascending: false });

    if (eventsErr) throw new Error(eventsErr.message);

    return { ok: true, events: (events || []) as ScheduleEvent[] };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Failed" };
  }
}

export async function deleteScheduleEventAction(params: {
  eventId: string;
}) {
  try {
    const supabase = await getServerSupabase();

    const { error } = await supabase
      .from("student_schedule_events")
      .delete()
      .eq("id", params.eventId);

    if (error) throw new Error(error.message);

    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Failed" };
  }
}
