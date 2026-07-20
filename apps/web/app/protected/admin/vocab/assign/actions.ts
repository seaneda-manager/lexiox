// apps/web/app/(protected)/admin/vocab/assign/actions.ts
"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import {
  createStudentVocabPlanAction,
  getStudentPlanAndQueueAction,
} from "../Tracks/actions";

/* =========================================================
 * Types
 * ======================================================= */
export type StudentRow = {
  id: string;
  login_id: string | null;
  full_name: string | null;
  grade: string | null;
  school: string | null;
};

export type TrackReadiness = {
  id: string;
  slug: string | null;
  title: string | null;
  total_days: number | null;
  mappedDays: number; // vocab_track_sets 에 연결된 Day 수
  readyDays: number; // 그 중 단어가 1개 이상 들어있는 Day 수
  emptyDays: number[]; // 단어가 0개인 Day 목록
  readyDayIndexes: number[]; // 단어가 들어있는 Day 인덱스(정렬)
  isReady: boolean; // mappedDays > 0 && emptyDays.length === 0
};

export type AssignOutcome = {
  ok: boolean;
  reason: string | null; // ensure 의 reason (성공이면 null)
  assignedCount: number;
  note: string | null;
  planId: string | null;
  // 저장 직후 큐 스냅샷
  todayISO: string;
  queue: Array<{
    id: string;
    day_index: number;
    set_id: string;
    status: string;
    available_at: string;
    started_at: string | null;
    completed_at: string | null;
  }>;
  queueCount: number;
  unlockedCount: number;
  error: string | null;
};

function cleanStr(s: unknown): string {
  return String(s ?? "").trim();
}

/** 학생 목록 (활성만) */
export async function listStudentsAction(): Promise<
  { ok: true; rows: StudentRow[] } | { ok: false; error: string }
> {
  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from("academy_students")
      .select("id, login_id, full_name, grade, school")
      .eq("is_active", true)
      .order("grade", { ascending: true })
      .order("full_name", { ascending: true })
      .limit(2000);

    if (error) return { ok: false, error: error.message };
    return { ok: true, rows: (data ?? []) as StudentRow[] };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "students query failed" };
  }
}

/**
 * 트랙 목록 + 준비 상태
 * - mappedDays: vocab_track_sets(track_id) 로 연결된 Day 수  ← 큐 빌더가 읽는 진짜 소스
 * - readyDays: 그 Day 들 중 단어가 실제로 들어있는 세트 수
 * - emptyDays: 단어 0개인 Day 목록
 */
export async function listTracksWithReadinessAction(): Promise<
  { ok: true; rows: TrackReadiness[] } | { ok: false; error: string }
> {
  try {
    const supabase = await getServerSupabase();

    const { data: tracks, error: terr } = await supabase
      .from("vocab_tracks")
      .select("id, slug, title, total_days")
      .order("created_at", { ascending: false });

    if (terr) return { ok: false, error: terr.message };

    const trackRows = (tracks ?? []) as Array<{
      id: string;
      slug: string | null;
      title: string | null;
      total_days: number | null;
    }>;

    // Course 모델: 세트가 소속(track_id)+순서(order_index)를 직접 가진다.
    const { data: mappings, error: merr } = await supabase
      .from("vocab_sets")
      .select("id, track_id, order_index")
      .not("track_id", "is", null)
      .not("order_index", "is", null)
      .limit(20000);

    if (merr) return { ok: false, error: merr.message };

    const byTrack = new Map<string, Array<{ day: number; setId: string }>>();
    const allSetIds = new Set<string>();
    for (const m of (mappings ?? []) as any[]) {
      const tid = String(m.track_id);
      const setId = String(m.id);
      const day = Number(m.order_index);
      if (!byTrack.has(tid)) byTrack.set(tid, []);
      byTrack.get(tid)!.push({ day, setId });
      allSetIds.add(setId);
    }

    // 비어있지 않은 set_id 집합 구하기 (청크 in-query)
    const nonEmptySets = await getNonEmptySetIds(supabase, Array.from(allSetIds));

    const rows: TrackReadiness[] = trackRows.map((t) => {
      const maps = byTrack.get(t.id) ?? [];
      const mappedDays = maps.length;
      const emptyDays: number[] = [];
      const readyDayIndexes: number[] = [];
      for (const m of maps) {
        if (nonEmptySets.has(m.setId)) readyDayIndexes.push(m.day);
        else emptyDays.push(m.day);
      }
      emptyDays.sort((a, b) => a - b);
      readyDayIndexes.sort((a, b) => a - b);
      return {
        id: t.id,
        slug: t.slug,
        title: t.title,
        total_days: t.total_days,
        mappedDays,
        readyDays: readyDayIndexes.length,
        emptyDays,
        readyDayIndexes,
        isReady: mappedDays > 0 && emptyDays.length === 0,
      };
    });

    return { ok: true, rows };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "tracks query failed" };
  }
}

async function getNonEmptySetIds(
  supabase: Awaited<ReturnType<typeof getServerSupabase>>,
  setIds: string[],
): Promise<Set<string>> {
  const result = new Set<string>();
  if (setIds.length === 0) return result;

  const CHUNK = 100;
  for (let i = 0; i < setIds.length; i += CHUNK) {
    const chunk = setIds.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from("vocab_set_items")
      .select("set_id")
      .in("set_id", chunk)
      .limit(50000);
    if (error) throw new Error(`vocab_set_items lookup failed: ${error.message}`);
    for (const r of (data ?? []) as any[]) {
      result.add(String(r.set_id));
    }
  }
  return result;
}

const EMPTY_OUTCOME: AssignOutcome = {
  ok: false,
  reason: null,
  assignedCount: 0,
  note: null,
  planId: null,
  todayISO: "",
  queue: [],
  queueCount: 0,
  unlockedCount: 0,
  error: null,
};

/** 한 학생에게 한 과정 배정 (내부용) */
async function assignOneCourse(params: {
  studentId: string;
  trackId: string;
  startDateISO: string;
  weekdays: number[];
  setsPerDay: number;
}): Promise<AssignOutcome> {
  try {
    const res = await createStudentVocabPlanAction({
      studentId: cleanStr(params.studentId),
      trackId: cleanStr(params.trackId),
      startDateISO: cleanStr(params.startDateISO),
      weekdays: params.weekdays,
      startDayIndex: 1,
      setsPerDay: params.setsPerDay,
    } as any);

    const ensure = (res as any)?.ensure ?? {};
    const assignedCount = Number(ensure?.assignedCount ?? 0);
    const reason = ensure?.assigned === false ? String(ensure?.reason ?? "UNKNOWN") : null;
    const note = ensure?.note ? String(ensure.note) : null;

    const snap = await getStudentPlanAndQueueAction({
      studentId: cleanStr(params.studentId),
      trackId: cleanStr(params.trackId),
    });

    if ("error" in snap) {
      return {
        ...EMPTY_OUTCOME,
        ok: false,
        reason,
        assignedCount,
        note,
        planId: (res as any)?.planId ?? null,
        error: snap.error,
      };
    }

    return {
      ok: reason === null,
      reason,
      assignedCount,
      note,
      planId: (res as any)?.planId ?? null,
      todayISO: snap.todayISO,
      queue: (snap.queue ?? []) as any,
      queueCount: snap.queueCount,
      unlockedCount: snap.unlockedCount,
      error: null,
    };
  } catch (e: any) {
    return { ...EMPTY_OUTCOME, error: e?.message ?? "assign failed" };
  }
}

export type CourseAssignResult = {
  trackId: string;
  title: string;
  outcome: AssignOutcome;
};

/**
 * 한 학생에게 여러 과정을 한 번에 배정.
 * - 과정마다 플랜 생성 + 큐 오픈, 결과를 과정별로 정직하게 반환.
 */
export async function assignCoursesAction(params: {
  studentId: string;
  courses: Array<{ trackId: string; title: string }>;
  startDateISO: string;
  weekdays: number[];
  setsPerDay: number;
}): Promise<{ ok: boolean; results: CourseAssignResult[]; error: string | null }> {
  const studentId = cleanStr(params.studentId);
  if (!studentId) return { ok: false, results: [], error: "학생을 선택하세요." };
  if (!params.courses?.length) return { ok: false, results: [], error: "과정을 선택하세요." };

  const results: CourseAssignResult[] = [];
  for (const c of params.courses) {
    const outcome = await assignOneCourse({
      studentId,
      trackId: c.trackId,
      startDateISO: params.startDateISO,
      weekdays: params.weekdays,
      setsPerDay: params.setsPerDay,
    });
    results.push({ trackId: c.trackId, title: c.title, outcome });
  }

  const allOk = results.every((r) => r.outcome.ok);
  return { ok: allOk, results, error: null };
}

/** 조회 전용: 현재 플랜/큐 스냅샷 */
export async function loadPlanSnapshotAction(params: {
  studentId: string;
  trackId: string;
}): Promise<AssignOutcome> {
  const empty: AssignOutcome = {
    ok: false,
    reason: null,
    assignedCount: 0,
    note: null,
    planId: null,
    todayISO: "",
    queue: [],
    queueCount: 0,
    unlockedCount: 0,
    error: null,
  };
  try {
    const snap = await getStudentPlanAndQueueAction({
      studentId: cleanStr(params.studentId),
      trackId: cleanStr(params.trackId),
    });
    if ("error" in snap) return { ...empty, error: snap.error };
    return {
      ok: true,
      reason: null,
      assignedCount: 0,
      note: null,
      planId: (snap.plan as any)?.id ?? null,
      todayISO: snap.todayISO,
      queue: (snap.queue ?? []) as any,
      queueCount: snap.queueCount,
      unlockedCount: snap.unlockedCount,
      error: null,
    };
  } catch (e: any) {
    return { ...empty, error: e?.message ?? "load failed" };
  }
}
