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
  startDayIndex: number;
  totalDays: number;
  completedDays: number;
  inProgressDays: number;
  isPaused: boolean;
  lastCompletedDate: string | null;
  nextAvailableDate: string | null;
  /** Speed 버전 학생별 오버라이드. null이면 Track 기본값(trackSpeedMode)을 따름 */
  speedMode: "full" | "simple" | null;
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
}): Promise<
  | { ok: true; rows: StudentProgress[]; todayISO: string; trackSpeedMode: "full" | "simple" }
  | { ok: false; error: string }
> {
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

    // Track 기본 speed_mode (방어적 — 미마이그레이션 DB에서도 화면이 안 깨지도록). 기본 'simple'.
    let trackSpeedMode: "full" | "simple" = "simple";
    try {
      const { data: tsm } = await supabase
        .from("vocab_tracks")
        .select("speed_mode")
        .eq("id", trackId)
        .maybeSingle();
      if ((tsm as any)?.speed_mode === "full") trackSpeedMode = "full";
    } catch {
      /* 컬럼 없음 → 'simple' */
    }

    if (plans.length === 0) return { ok: true, rows: [], todayISO, trackSpeedMode };

    const studentIds = plans.map((p: any) => String(p.student_id));

    // 학생별 speed_mode 오버라이드 (별도·방어적 조회)
    const speedModeByStudent: Record<string, "full" | "simple" | null> = {};
    try {
      const { data: smRows } = await supabase
        .from("student_vocab_plans")
        .select("student_id, speed_mode")
        .eq("track_id", trackId)
        .in("student_id", studentIds);
      for (const r of smRows ?? []) {
        const v = (r as any).speed_mode;
        speedModeByStudent[String((r as any).student_id)] =
          v === "full" || v === "simple" ? v : null;
      }
    } catch {
      /* 컬럼 없음 → 전부 null(=Track 기본값) */
    }

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
        startDayIndex: Number(plan.start_day_index ?? 1),
        totalDays,
        completedDays,
        inProgressDays,
        isPaused: Boolean(plan.is_paused),
        lastCompletedDate,
        nextAvailableDate,
        speedMode: speedModeByStudent[sid] ?? null,
      };
    });

    rows.sort((a, b) => {
      const g = String(a.grade ?? "").localeCompare(String(b.grade ?? ""));
      if (g !== 0) return g;
      return a.name.localeCompare(b.name);
    });

    return { ok: true, rows, todayISO, trackSpeedMode };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "failed" };
  }
}

/**
 * 학생 1명의 Speed 버전 오버라이드 설정.
 * mode = null 이면 오버라이드 해제(= Track 기본값을 따름).
 */
export async function setStudentVocabSpeedModeAction(params: {
  studentId: string;
  trackId: string;
  mode: "full" | "simple" | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await getServerSupabase();
    const studentId = String(params.studentId ?? "").trim();
    const trackId = String(params.trackId ?? "").trim();
    if (!studentId || !trackId) return { ok: false, error: "studentId와 trackId가 필요합니다" };
    if (params.mode !== null && params.mode !== "full" && params.mode !== "simple") {
      return { ok: false, error: "mode는 'full' | 'simple' | null 이어야 합니다" };
    }

    const { error } = await supabase
      .from("student_vocab_plans")
      .update({ speed_mode: params.mode })
      .eq("student_id", studentId)
      .eq("track_id", trackId);

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "failed" };
  }
}

/* =========================================================
 * 학생 1명의 Day별 상세
 * 목록에는 완료 Day 수와 진도율만 나와서 "무엇을 어떻게 틀렸는지"를 알 수 없었다.
 * vocab_learning_attempts에 단계별 정확도와 틀린 단어가 이미 쌓여 있으므로
 * (2026-07-27 기준 131건) 그걸 Day 단위로 묶어 보여준다.
 * ======================================================= */

export type StageResult = {
  stage: "know" | "spelling" | "speed";
  accuracy: number | null;
  passed: boolean | null;
  wrongWords: string[];
  attemptedAt: string;
};

export type DayDetail = {
  dayIndex: number;
  setId: string;
  status: string | null;
  startedAt: string | null;
  completedAt: string | null;
  stages: StageResult[];
};

export async function getStudentVocabDetailAction(params: {
  studentId: string;
  trackId: string;
}): Promise<{ ok: true; days: DayDetail[] } | { ok: false; error: string }> {
  try {
    const supabase = await getServerSupabase();
    const studentId = String(params.studentId ?? "").trim();
    const trackId = String(params.trackId ?? "").trim();
    if (!studentId || !trackId) return { ok: false, error: "studentId와 trackId가 필요합니다" };

    // 이 학생이 이 트랙에서 받은 Day들
    const { data: assignments, error: asgError } = await supabase
      .from("student_vocab_assignments")
      .select("set_id, day_index, status, started_at, completed_at")
      .eq("student_id", studentId)
      .eq("track_id", trackId)
      .order("day_index", { ascending: true });
    if (asgError) throw asgError;

    const setIds = Array.from(
      new Set((assignments ?? []).map((a: any) => a.set_id).filter(Boolean)),
    );
    if (setIds.length === 0) return { ok: true, days: [] };

    // 단계별 시도 기록
    const { data: attempts, error: attError } = await supabase
      .from("vocab_learning_attempts")
      .select("set_id, stage, accuracy, passed, wrong_word_ids, attempted_at")
      .eq("student_id", studentId)
      .in("set_id", setIds)
      .order("attempted_at", { ascending: true });
    if (attError) throw attError;

    // 틀린 단어 id → 표기 (한 번에 조회)
    const wrongIds = new Set<string>();
    for (const a of attempts ?? []) {
      for (const id of (a.wrong_word_ids as string[]) ?? []) if (id) wrongIds.add(id);
    }

    const wordText = new Map<string, string>();
    if (wrongIds.size > 0) {
      const { data: words } = await supabase
        .from("words")
        .select("id, text")
        .in("id", Array.from(wrongIds));
      for (const w of words ?? []) wordText.set(w.id, w.text);
    }

    const attemptsBySet = new Map<string, StageResult[]>();
    for (const a of attempts ?? []) {
      const list = attemptsBySet.get(a.set_id) ?? [];
      list.push({
        stage: a.stage as StageResult["stage"],
        accuracy: a.accuracy,
        passed: a.passed,
        // 시드 데이터에는 실제 단어 id가 아닌 값도 있어서, 못 찾으면 원래 값을 그대로 보여준다.
        wrongWords: (((a.wrong_word_ids as string[]) ?? [])
          .filter(Boolean)
          .map((id) => wordText.get(id) ?? id)),
        attemptedAt: a.attempted_at,
      });
      attemptsBySet.set(a.set_id, list);
    }

    const days: DayDetail[] = (assignments ?? []).map((a: any) => ({
      dayIndex: Number(a.day_index ?? 0),
      setId: a.set_id,
      status: a.status ?? null,
      startedAt: a.started_at ?? null,
      completedAt: a.completed_at ?? null,
      stages: attemptsBySet.get(a.set_id) ?? [],
    }));

    return { ok: true, days };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "failed" };
  }
}
