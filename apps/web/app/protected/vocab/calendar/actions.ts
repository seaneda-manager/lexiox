"use server";

import { getServerSupabase } from "@/lib/supabase/server";

export type CalendarAssignment = {
  id: string;
  track_id: string;
  track_title: string;
  day_index: number;
  available_at: string;
  started_at: string | null;
  completed_at: string | null;
  status: string;
};

export type CourseCalendar = {
  track_id: string;
  track_title: string;
  start_date: string;
  total_days: number;
  assignments: CalendarAssignment[];
};

export async function getStudentCalendarAction() {
  try {
    const supabase = await getServerSupabase();

    // Get current user
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user?.id) throw new Error("Not authenticated");

    // Get student ID
    const { data: student, error: studentErr } = await supabase
      .from("academy_students")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (studentErr || !student?.id) throw new Error("Student not found");

    // Get all assignments for this student
    const { data: assignments, error: assignErr } = await supabase
      .from("student_vocab_assignments")
      .select(
        `id, track_id, day_index, available_at, started_at, completed_at, status,
         vocab_tracks(id, title)`
      )
      .eq("student_id", student.id)
      .order("track_id")
      .order("day_index");

    if (assignErr) throw new Error(assignErr.message);

    // Get student plans for date range info
    const { data: plans, error: planErr } = await supabase
      .from("student_vocab_plans")
      .select("track_id, start_date, weekdays")
      .eq("student_id", student.id);

    if (planErr) throw new Error(planErr.message);

    // Get track info
    const { data: tracks, error: trackErr } = await supabase
      .from("vocab_tracks")
      .select("id, title, total_days");

    if (trackErr) throw new Error(trackErr.message);

    // Group assignments by track
    const courseMap = new Map<string, CourseCalendar>();

    for (const assignment of assignments || []) {
      const trackId = assignment.track_id;
      const track = (assignment.vocab_tracks as any);
      const plan = plans?.find((p) => p.track_id === trackId);
      const trackInfo = tracks?.find((t) => t.id === trackId);

      if (!courseMap.has(trackId)) {
        courseMap.set(trackId, {
          track_id: trackId,
          track_title: track?.title || "Unknown",
          start_date: plan?.start_date || "",
          total_days: trackInfo?.total_days || 0,
          assignments: [],
        });
      }

      const course = courseMap.get(trackId)!;
      course.assignments.push({
        id: assignment.id,
        track_id: trackId,
        track_title: track?.title || "Unknown",
        day_index: assignment.day_index,
        available_at: assignment.available_at,
        started_at: assignment.started_at,
        completed_at: assignment.completed_at,
        status: assignment.status,
      });
    }

    return {
      ok: true,
      courses: Array.from(courseMap.values()),
    };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Failed" };
  }
}
