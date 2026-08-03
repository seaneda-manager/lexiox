"use server";

import { getServerSupabase } from "@/lib/supabase/server";

export type CalendarAssignment = {
  id: string;
  course_id: string;
  course_type: string; // vocab, speaking, listening, reading, writing, grammar
  course_title: string;
  day_index?: number;
  available_at: string;
  started_at: string | null;
  completed_at: string | null;
  status: string;
};

export type CourseCalendar = {
  course_id: string;
  course_type: string;
  course_title: string;
  start_date: string;
  total_days: number;
  assignments: CalendarAssignment[];
};

// Course type colors for UI
export const courseTypeColors: Record<string, string> = {
  vocab: "bg-blue-100 text-blue-800 border-blue-300",
  speaking: "bg-red-100 text-red-800 border-red-300",
  listening: "bg-purple-100 text-purple-800 border-purple-300",
  reading: "bg-green-100 text-green-800 border-green-300",
  writing: "bg-yellow-100 text-yellow-800 border-yellow-300",
  grammar: "bg-orange-100 text-orange-800 border-orange-300",
};

export const courseTypeLabels: Record<string, string> = {
  vocab: "단어",
  speaking: "스피킹",
  listening: "리스닝",
  reading: "리딩",
  writing: "라이팅",
  grammar: "문법",
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

    const studentId = student.id;
    const courseMap = new Map<string, CourseCalendar>();

    // ===== VOCAB COURSES =====
    const { data: vocabAssignments, error: vocabErr } = await supabase
      .from("student_vocab_assignments")
      .select(
        `id, track_id, day_index, available_at, started_at, completed_at, status,
         vocab_tracks(id, title)`
      )
      .eq("student_id", studentId)
      .order("track_id")
      .order("day_index");

    if (vocabErr) throw new Error(vocabErr.message);

    const { data: vocabPlans } = await supabase
      .from("student_vocab_plans")
      .select("track_id, start_date")
      .eq("student_id", studentId);

    const { data: vocabTracks } = await supabase
      .from("vocab_tracks")
      .select("id, title, total_days");

    // Process vocab assignments
    for (const assignment of vocabAssignments || []) {
      const trackId = assignment.track_id;
      const track = (assignment.vocab_tracks as any);
      const plan = vocabPlans?.find((p) => p.track_id === trackId);
      const trackInfo = vocabTracks?.find((t) => t.id === trackId);

      const courseKey = `vocab_${trackId}`;

      if (!courseMap.has(courseKey)) {
        courseMap.set(courseKey, {
          course_id: trackId,
          course_type: "vocab",
          course_title: track?.title || "Unknown",
          start_date: plan?.start_date || "",
          total_days: trackInfo?.total_days || 0,
          assignments: [],
        });
      }

      const course = courseMap.get(courseKey)!;
      course.assignments.push({
        id: assignment.id,
        course_id: trackId,
        course_type: "vocab",
        course_title: track?.title || "Unknown",
        day_index: assignment.day_index,
        available_at: assignment.available_at,
        started_at: assignment.started_at,
        completed_at: assignment.completed_at,
        status: assignment.status,
      });
    }

    // ===== 향후 추가: SPEAKING, LISTENING, READING, WRITING, GRAMMAR =====
    // 각 과정이 유사한 assignments 구조를 가지면 위의 vocab 패턴을 반복

    return {
      ok: true,
      courses: Array.from(courseMap.values()),
    };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Failed" };
  }
}
