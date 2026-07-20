// apps/web/app/(protected)/admin/vocab/progress/actions.ts
"use server";

import { getServerSupabase } from "@/lib/supabase/server";

function toISODateLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export type TrackSummary = {
  id: string;
  slug: string | null;
  title: string | null;
  total_days: number | null;
};

export type StudentProgress = {
  studentId: string;
  name: string;
  grade: string | null;
  school: string | null;
  loginId: string | null;
  startDate: string;
  cursorDay: number;
  totalDays: number;
  completedDays: number;
  inProgressDays: number;
  isPaused: boolean;
  lastCompletedDate: string | null;
  nextAvailableDate: string | null;
};

export async function listVocabTracksForProgressAction(): Promise<
  { ok: true; tracks: TrackSummary[] } | { ok: false; error: string }
> {
  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from("vocab_tracks")
      .select("id, slug, title, total_days")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) return { ok: false, error: error.message };
    return { ok: true, tracks: (data ?? []) as TrackSummary[] };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "failed" };
  }
}

export async function listStudentProgressForTrackAction(params: {
  trackId: string;
}): Promise<{ ok: true; rows: StudentProgress[]; todayISO: string } | { ok: false; error: string }> {
  try {
    const supabase = await getServerSupabase();
    const trackId = params.trackId.trim();
    if (!trackId) return { ok: false, error: "trackId required" };

    const todayISO = toISODateLocal(new Date());

    const [plansRes, trackRes] = await Promise.all([
      supabase
        .from("student_vocab_plans")
        .select(
          "student_id, start_date, cursor_day_index, is_paused, weekdays, start_day_index, max_active_sets",
        )
        .eq("track_id", trackId)
        .limit(1000),
      supabase
        .from("vocab_tracks")
        .select("total_days")
        .eq("id", trackId)
        .maybeSingle(),
    ]);

    if (plansRes.error) return { ok: false, error: plansRes.error.message };
    const plans = (plansRes.data ?? []) as any[];
    const totalDays = Number((trackRes.data as any)?.total_days ?? 0);

    if (plans.length === 0) return { ok: true, rows: [], todayISO };

    const studentIds = plans.map((p: any) => String(p.student_id));

    const [studentsRes, assignmentsRes] = await Promise.all([
      supabase
        .from("academy_students")
        .select("id, full_name, grade, school, login_id")
        .in("id", studentIds),
      supabase
        .from("student_vocab_assignments")
        .select("student_id, day_index, status, completed_at, started_at, available_at")
        .eq("track_id", trackId)
        .in("student_id", studentIds)
        .order("day_index", { ascending: true })
        .limit(50000),
    ]);

    const studentMap = new Map<string, any>(
      (studentsRes.data ?? []).map((s: any) => [String(s.id), s]),
    );

    type AsgRow = { student_id: string; day_index: number; completed_at: string | null; started_at: string | null; available_at: string };
    const byStudent = new Map<string, AsgRow[]>();
    for (const a of (assignmentsRes.data ?? []) as AsgRow[]) {
      const sid = String(a.student_id);
      if (!byStudent.has(sid)) byStudent.set(sid, []);
      byStudent.get(sid)!.push(a);
    }

    const rows: StudentProgress[] = plans.map((plan: any) => {
      const sid = String(plan.student_id);
      const student = studentMap.get(sid);
      const asgList = byStudent.get(sid) ?? [];

      const completedDays = asgList.filter((a) => a.completed_at != null).length;
      const inProgressDays = asgList.filter((a) => a.started_at != null && a.completed_at == null).length;

      const completedSorted = asgList
        .filter((a) => a.completed_at)
        .sort((a, b) => (b.completed_at! > a.completed_at! ? 1 : -1));
      const lastCompletedDate = completedSorted[0]?.completed_at?.slice(0, 10) ?? null;

      const pending = asgList
        .filter((a) => a.completed_at == null)
        .sort((a, b) => (a.available_at > b.available_at ? 1 : -1));
      const nextAvailableDate = pending[0]?.available_at?.slice(0, 10) ?? null;

      return {
        studentId: sid,
        name: String(student?.full_name ?? sid),
        grade: String(student?.grade ?? ""),
        school: String(student?.school ?? ""),
        loginId: String(student?.login_id ?? ""),
        startDate: String(plan.start_date ?? ""),
        cursorDay: Number(plan.cursor_day_index ?? plan.start_day_index ?? 1),
        totalDays,
        completedDays,
        inProgressDays,
        isPaused: Boolean(plan.is_paused),
        lastCompletedDate,
        nextAvailableDate,
      };
    });

    rows.sort((a, b) => {
      const g = String(a.grade ?? "").localeCompare(String(b.grade ?? ""));
      if (g !== 0) return g;
      return a.name.localeCompare(b.name);
    });

    return { ok: true, rows, todayISO };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "failed" };
  }
}
