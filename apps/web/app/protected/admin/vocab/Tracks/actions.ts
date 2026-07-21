// apps/web/app/(protected)/admin/vocab/tracks/actions.ts
"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { createVocabSetFromRawAction } from "../sets/new/actions";

import {
  syncTrackFromExistingDaySetsAction as _syncTrackFromExistingDaySetsAction,
} from "./syncTrackFromExistingDaySetsAction";

export async function syncTrackFromExistingDaySetsAction(
  input: Parameters<typeof _syncTrackFromExistingDaySetsAction>[0],
) {
  return _syncTrackFromExistingDaySetsAction(input);
}

function cleanStr(s: unknown): string {
  return String(s ?? "").trim();
}
function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function toISOWeekday(date: Date) {
  // 1=Mon ... 7=Sun
  const d = date.getDay(); // 0=Sun..6=Sat
  return d === 0 ? 7 : d;
}
function parseISODate(dateISO: string): Date {
  const [y, m, d] = dateISO.split("-").map((x) => Number(x));
  if (!y || !m || !d) throw new Error("date must be YYYY-MM-DD");
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) throw new Error("Invalid date");
  dt.setHours(0, 0, 0, 0);
  return dt;
}

/** local date (YYYY-MM-DD) */
function toISODateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function addDaysLocal(d: Date, days: number): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() + days);
  return x;
}
function nextScheduledISODateLocal(from: Date, weekdays: number[]): string {
  const base = new Date(from);
  base.setHours(0, 0, 0, 0);

  const allowed = Array.isArray(weekdays)
    ? weekdays.map(Number).filter((n) => n >= 1 && n <= 7)
    : [];

  // schedule missing -> treat as today
  if (allowed.length === 0) return toISODateLocal(base);

  // 오늘부터 검색 (i=0부터 시작하므로 오늘이 가능한 요일이면 오늘 반환)
  for (let i = 0; i < 14; i++) {
    const d = addDaysLocal(base, i);
    const wd = toISOWeekday(d);
    if (allowed.includes(wd)) return toISODateLocal(d);
  }
  return toISODateLocal(base);
}
function nextScheduledISODateAfterISO(prevISO: string, weekdays: number[]): string {
  const prev = parseISODate(prevISO);
  return nextScheduledISODateLocal(prev, weekdays);
}
function clampInt(n: unknown, min: number, max: number, fallback: number) {
  const x = Number(n);
  if (!Number.isFinite(x)) return fallback;
  return Math.min(Math.max(Math.trunc(x), min), max);
}

type Supa = Awaited<ReturnType<typeof getServerSupabase>>;

/* =========================
 * Types (NO database.types dependency)
 * ======================= */
export type StudentLite = {
  id: string;
  auth_user_id: string | null;
  login_id: string | null;
  full_name: string | null;
  grade: string | null;
  school: string | null;
  is_active: boolean | null;
  must_change_password: boolean | null;
  created_at: string | null;
};

export type TrackLite = {
  id: string;
  slug: string | null;
  title: string | null;
  description: string | null;
  total_days: number | null;
  created_at: string | null;
  is_active?: boolean | null; // may not exist in DB yet
};

export type StudentPlanLite = {
  id: string;
  student_id: string;
  track_id: string;
  start_date: string;
  weekdays: number[];
  max_active_sets: number | null;
  is_enabled: boolean | null;
  start_day_index: number | null;
  cursor_day_index: number | null;
  is_paused: boolean | null;
  paused_reason: string | null;
};

export type StudentBreakLite = {
  id: string;
  student_id: string;
  start_date: string;
  end_date: string;
  mode: string;
  exam_track_id: string | null;
  note: string | null;
};

export type AssignmentLite = {
  id: string;
  student_id: string;
  track_id: string;
  day_index: number;
  set_id: string;
  status: string;
  available_at: string;
  assigned_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  note: string | null;
};

export type ListAcademyStudentsResult =
  | { ok: true; rows: StudentLite[] }
  | { ok: false; error: string };

export type ListVocabTracksResult =
  | { ok: true; rows: TrackLite[] }
  | { ok: false; error: string };

export type GetPlanAndQueueResult =
  | {
      ok: true;
      todayISO: string;
      todayWeekday: number;
      plan: StudentPlanLite | null;
      breaks: StudentBreakLite[];
      queue: AssignmentLite[];
      queueCount: number;
      unlockedCount: number;
      maxActive: number;
    }
  | { ok: false; error: string };

export type EnsureCockedQueueResult =
  | {
      assigned: boolean;
      assignedCount: number;
      created: Array<{
        assignmentId: string;
        dayIndex: number;
        setId: string;
        availableAt: string;
      }>;
      todayISO: string;
      todayWeekday: number;
      queueSize: number;
      queueCount: number;
      unlockedCount: number;
      maxActive: number;
      cursor: number;
      startDay: number;
      trackIdUsed: string;
      note?: string;
    }
  | {
      assigned: false;
      reason: string;
      todayISO?: string;
      todayWeekday?: number;
      queueSize?: number;
      queueCount?: number;
      unlockedCount?: number;
      maxActive?: number;
      cursor?: number;
      startDay?: number;
      trackIdUsed?: string;
      note?: string;
    };

async function getUserOrThrow(supabase: Supa) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Login required");
  return user;
}

/**
 * days json 형태는 유연하게 받음:
 * - [{ day: 1, words: ["a","b"] }, ...]
 * - [{ day: 1, title?: "...", raw?: "a\nb\nc" }, ...]
 * - word list key는 words/items/list 중 아무거나 지원
 */
function parseDaysJson(
  daysJsonText: string,
): { day: number; title?: string | null; words: string[] }[] {
  const txt = cleanStr(daysJsonText);
  if (!txt) return [];

  let parsed: any;
  try {
    parsed = JSON.parse(txt);
  } catch {
    throw new Error("daysJsonText JSON parse failed");
  }
  if (!Array.isArray(parsed)) throw new Error("daysJsonText must be an array");

  const out: { day: number; title?: string | null; words: string[] }[] = [];

  for (const row of parsed) {
    const day = Number(row?.day ?? row?.dayIndex ?? row?.index);
    if (!Number.isFinite(day) || day < 1) continue;

    const title = cleanStr(row?.title ?? row?.label ?? "") || null;

    const raw = cleanStr(row?.raw ?? row?.text ?? "");
    if (raw) {
      const words = raw
        .split(/\r?\n/g)
        .map((l: string) => cleanStr(l))
        .filter(Boolean);
      out.push({ day, title, words });
      continue;
    }

    const arr =
      row?.words ??
      row?.items ??
      row?.list ??
      row?.wordList ??
      row?.vocab ??
      [];
    const words = Array.isArray(arr)
      ? arr.map((x: any) => cleanStr(x)).filter(Boolean)
      : [];

    out.push({ day, title, words });
  }

  out.sort((a, b) => a.day - b.day);
  return out;
}

/**
 * ✅ Student resolver
 * student_vocab_plans.student_id FK → academy_students.id
 *
 * UI input may be:
 * - academy_students.id (uuid)
 * - academy_students.auth_user_id (uuid)
 * - academy_students.login_id (string)
 *
 * Always returns academy_students.id
 */
async function resolveAcademyStudentIdOrThrow(
  supabase: Supa,
  studentIdOrAuthOrLogin: string,
): Promise<string> {
  const key = cleanStr(studentIdOrAuthOrLogin);
  if (!key) throw new Error("studentId is required");

  // 1) match by academy_students.id
  const { data: byId, error: e1 } = await supabase
    .from("academy_students")
    .select("id")
    .eq("id", key)
    .maybeSingle();

  if (e1) throw new Error("academy_students lookup failed (by id)");
  if ((byId as any)?.id) return String((byId as any).id);

  // 2) match by academy_students.auth_user_id
  const { data: byAuth, error: e2 } = await supabase
    .from("academy_students")
    .select("id")
    .eq("auth_user_id", key)
    .maybeSingle();

  if (e2) throw new Error("academy_students lookup failed (by auth_user_id)");
  if ((byAuth as any)?.id) return String((byAuth as any).id);

  // 3) match by academy_students.login_id
  const { data: byLogin, error: e3 } = await supabase
    .from("academy_students")
    .select("id")
    .eq("login_id", key)
    .maybeSingle();

  if (e3) throw new Error("academy_students lookup failed (by login_id)");
  if ((byLogin as any)?.id) return String((byLogin as any).id);

  throw new Error(
    "Valid student not found (need academy_students.id / auth_user_id / login_id)",
  );
}

/* =========================================================
 * ✅ helper: count items for a set
 * ======================================================= */
async function getSetItemCount(
  supabase: Supa,
  setId: string,
): Promise<number> {
  const sid = cleanStr(setId);
  if (!sid) return 0;

  // head:true로 row 안 가져오고 count만
  const { count, error } = await (supabase as any)
    .from("vocab_set_items")
    .select("word_id", { count: "exact", head: true })
    .eq("set_id", sid);

  if (error) throw new Error(`vocab_set_items count failed: ${error.message ?? ""}`);
  return Number(count ?? 0);
}

async function assertSetNotEmptyOrThrow(
  supabase: Supa,
  setId: string,
  context: string,
) {
  const cnt = await getSetItemCount(supabase, setId);
  if (cnt <= 0) {
    throw new Error(`EMPTY_SET: set has no items | setId=${setId} | ctx=${context}`);
  }
}

/* =========================================================
 * (Admin/Teacher) 학생 목록
 * ======================================================= */
export async function listAcademyStudentsAction(): Promise<ListAcademyStudentsResult> {
  try {
    const supabase = await getServerSupabase();
    await getUserOrThrow(supabase);

    const { data, error } = await supabase
      .from("academy_students")
      .select(
        "id, auth_user_id, login_id, full_name, grade, school, is_active, must_change_password, created_at",
      )
      .eq("is_active", true)
      .order("grade", { ascending: true })
      .order("full_name", { ascending: true })
      .limit(1000);

    if (error) return { ok: false, error: error.message ?? "students query failed" };
    return { ok: true, rows: (data ?? []) as any };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "students query failed" };
  }
}

/* =========================================================
 * Track 목록
 *  - 1차: is_active 컬럼이 있으면 active only
 *  - 2차(안전 fallback): is_active 없으면 그냥 전체 반환 (절대 안 터짐)
 * ======================================================= */
export async function listVocabTracksAction(): Promise<ListVocabTracksResult> {
  try {
    const supabase = await getServerSupabase();
    await getUserOrThrow(supabase);

    // Query all tracks (not filtered by is_active)
    const r = await supabase
      .from("vocab_tracks")
      .select("id, slug, title, description, total_days, created_at")
      .order("created_at", { ascending: false });

    if (r.error) return { ok: false, error: r.error.message ?? "tracks query failed" };
    return { ok: true, rows: (r.data ?? []) as any };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "tracks query failed" };
  }
}

/* =========================================================
 * 선택된 세트의 트랙 조회
 * ======================================================= */
export async function getTracksForSetsAction(
  setIds: string[]
): Promise<{ ok: boolean; trackIds: string[]; error?: string }> {
  try {
    if (!setIds.length) return { ok: true, trackIds: [] };

    const supabase = await getServerSupabase();
    await getUserOrThrow(supabase);

    const { data, error } = await supabase
      .from("vocab_sets")
      .select("track_id")
      .in("id", setIds);

    if (error) return { ok: false, trackIds: [], error: error.message };

    // 중복 제거 및 null 필터링
    const trackIds = Array.from(
      new Set((data ?? []).map((d: any) => d.track_id).filter((id: string | null) => id !== null && id !== undefined))
    );

    return { ok: true, trackIds };
  } catch (e: any) {
    return { ok: false, trackIds: [], error: e?.message ?? "Failed to get tracks for sets" };
  }
}

/* =========================================================
 * 선택된 세트들을 트랙과 연결
 * ======================================================= */
export async function linkSetsToTrackAction(
  setIds: string[],
  trackId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!setIds.length || !trackId) {
      return { ok: false, error: "setIds and trackId are required" };
    }

    const supabase = await getServerSupabase();
    await getUserOrThrow(supabase);

    const { error } = await supabase
      .from("vocab_sets")
      .update({ track_id: trackId })
      .in("id", setIds);

    if (error) return { ok: false, error: error.message };

    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Failed to link sets to track" };
  }
}

/* =========================================================
 * Track + Day01~N Sets 생성 + vocab_track_sets 연결
 * - best effort: is_active=true 세팅 (컬럼 없으면 자동 fallback)
 * - (옵션) recockStudents=true면 해당 트랙 학생 큐를 재정렬
 * ======================================================= */
export async function createTrackAndSetsFromDaysJsonAction(params: {
  slug: string;
  title: string;
  description?: string | null;
  daysJsonText: string;
  strict?: boolean;

  /** OPTIONAL: after track sets update, recock students using this track */
  recockStudents?: boolean;
  recockQueueSize?: number;
}) {
  const supabase = await getServerSupabase();
  await getUserOrThrow(supabase);

  const slug = cleanStr(params.slug);
  const title = cleanStr(params.title);
  const description = cleanStr(params.description) || null;
  const strict = Boolean(params.strict);

  if (!slug) throw new Error("slug is required");
  if (!title) throw new Error("title is required");

  const days = parseDaysJson(params.daysJsonText);
  if (days.length === 0) throw new Error("No valid days in daysJsonText");

  // attempt #1: include is_active
  let trackRow: any = null;

  const r1 = await supabase
    .from("vocab_tracks")
    .upsert(
      { slug, title, description, total_days: days.length, is_active: true } as any,
      { onConflict: "slug" },
    )
    .select("id, slug, title, total_days")
    .single();

  if (!r1.error && r1.data?.id) {
    trackRow = r1.data;
  } else {
    const code = String((r1.error as any)?.code ?? "");
    if (code === "42703") {
      // fallback: no is_active column
      const r2 = await supabase
        .from("vocab_tracks")
        .upsert(
          { slug, title, description, total_days: days.length } as any,
          { onConflict: "slug" },
        )
        .select("id, slug, title, total_days")
        .single();

      if (r2.error || !r2.data?.id) throw new Error("track upsert failed");
      trackRow = r2.data;
    } else {
      throw new Error(`track upsert failed: ${r1.error?.message ?? ""}`);
    }
  }

  const trackId = String(trackRow.id);

  let createdSets = 0;
  const missingAll: Record<string, string[]> = {};

  for (const d of days) {
    const dayIndex = d.day;

    const { data: existingDay } = await supabase
      .from("vocab_track_sets")
      .select("id, day_index, set_id")
      .eq("track_id", trackId)
      .eq("day_index", dayIndex)
      .maybeSingle();

    if ((existingDay as any)?.id) continue;

    const dayTitle = `${title} Day ${pad2(dayIndex)}`;
    const raw = (d.words ?? []).join("\n");

    const res = await createVocabSetFromRawAction({
      title: dayTitle,
      description: `track:${slug} day:${pad2(dayIndex)}`,
      raw,
      strict,
    });

    // ✅ 세트 생성 후 "비었으면" 즉시 삭제 + 에러
    try {
      await assertSetNotEmptyOrThrow(
        supabase,
        String((res as any).setId),
        `createTrackAndSets track=${trackId} day=${dayIndex}`,
      );
    } catch (e: any) {
      await supabase.from("vocab_sets").delete().eq("id", String((res as any).setId));
      throw e;
    }

    if ((res as any).missing?.length) missingAll[String(dayIndex)] = (res as any).missing;

    // ✅ Course 모델(신규 소스): 세트에 소속(track_id)+순서(order_index)를 직접 박는다.
    const { error: setLinkErr } = await supabase
      .from("vocab_sets")
      .update({ track_id: trackId, order_index: dayIndex } as any)
      .eq("id", String((res as any).setId));

    if (setLinkErr) {
      throw new Error(`vocab_sets link failed (day ${dayIndex}): ${setLinkErr.message}`);
    }

    // (하위호환) 옛 연결 테이블도 함께 채워둔다 — 아직 이 테이블을 읽는 코드가 있으면 안 깨지게.
    const { error: linkErr } = await supabase
      .from("vocab_track_sets")
      .insert({
        track_id: trackId,
        day_index: dayIndex,
        set_id: (res as any).setId,
      } as any);

    if (linkErr) throw new Error(`vocab_track_sets insert failed (day ${dayIndex})`);

    createdSets++;
  }

  await supabase
    .from("vocab_tracks")
    .update({ total_days: days.length } as any)
    .eq("id", trackId);

  // OPTIONAL: recock
  const recockStudents = Boolean(params.recockStudents ?? false);
  const recockQueueSize = clampInt(params.recockQueueSize ?? 3, 1, 20, 3);

  let recockSummary: any = null;
  if (recockStudents) {
    // heavy mutation: require admin
    await assertAdminOrThrow2(supabase);
    recockSummary = await recockAllPlansForTrackAction({
      trackId,
      queueSize: recockQueueSize,
      dryRun: false,
    });
  }

  return { ok: true, trackId, totalDays: days.length, createdSets, missingAll, recockSummary };
}

/* =========================================================
 * Plan/Queue 조회 (UI용)
 * ======================================================= */
export async function getStudentPlanAndQueueAction(params: {
  studentId: string;
  trackId: string;
}): Promise<GetPlanAndQueueResult> {
  try {
    const supabase = await getServerSupabase();
    await getUserOrThrow(supabase);

    const studentId = await resolveAcademyStudentIdOrThrow(supabase, params.studentId);
    const trackId = cleanStr(params.trackId);
    if (!trackId) throw new Error("trackId is required");

    const now = new Date();
    const todayISO = toISODateLocal(now);
    const todayWeekday = toISOWeekday(now);

    const { data: plan, error: perr } = await supabase
      .from("student_vocab_plans")
      .select(
        "id, student_id, track_id, start_date, weekdays, max_active_sets, is_enabled, start_day_index, cursor_day_index, is_paused, paused_reason",
      )
      .eq("student_id", studentId)
      .eq("track_id", trackId)
      .maybeSingle();

    if (perr) throw new Error("plan lookup failed");

    const { data: breaks, error: berr } = await supabase
      .from("student_vocab_breaks")
      .select("id, student_id, start_date, end_date, mode, exam_track_id, note")
      .eq("student_id", studentId)
      .order("start_date", { ascending: false })
      .limit(30);

    if (berr) throw new Error("breaks lookup failed");

    const { data: queue, error: qerr } = await supabase
      .from("student_vocab_assignments")
      .select(
        "id, student_id, track_id, day_index, set_id, status, available_at, assigned_at, started_at, completed_at, note",
      )
      .eq("student_id", studentId)
      .eq("track_id", trackId)
      .is("completed_at", null)
      .order("day_index", { ascending: true })
      .limit(200);

    if (qerr) throw new Error("queue lookup failed");

    const queueCount = (queue ?? []).length;
    const unlockedCount = (queue ?? []).filter(
      (r: any) => String(r.available_at) <= todayISO,
    ).length;
    const maxActive = clampInt((plan as any)?.max_active_sets ?? 2, 1, 20, 2);

    return {
      ok: true,
      todayISO,
      todayWeekday,
      plan: (plan as any) ?? null,
      breaks: (breaks ?? []) as any,
      queue: (queue ?? []) as any,
      queueCount,
      unlockedCount,
      maxActive,
    };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "failed" };
  }
}

/* =========================================================
 * Plan 저장 + (auto) 큐 3개 Cocked 유지
 * ======================================================= */
export async function createStudentVocabPlanAction(params: {
  studentId: string; // academy_students.id (or auth_user_id/login_id tolerated)
  trackId: string;
  startDateISO: string;
  weekdays: number[]; // 1..7
  maxActiveSets?: number; // "open cap"
  startDayIndex?: number; // default 1
  cursorDayIndex?: number; // optional override
  isPaused?: boolean;
  pausedReason?: string | null;
  queueSize?: number; // default 3 (not stored)
  setsPerDay?: number; // 하루 몇 세트 (기본 1) — 저장됨. 지정 시 즉시 오픈 배치 크기로도 사용
}) {
  const supabase = await getServerSupabase();
  await getUserOrThrow(supabase);

  const studentId = await resolveAcademyStudentIdOrThrow(supabase, params.studentId);
  const trackId = cleanStr(params.trackId);
  const startDateISO = cleanStr(params.startDateISO);

  const weekdays = Array.isArray(params.weekdays)
    ? params.weekdays.map(Number).filter((n) => n >= 1 && n <= 7)
    : [];

  const maxActiveSets = clampInt(params.maxActiveSets ?? 2, 1, 20, 2);

  const startDayIndex = clampInt(params.startDayIndex ?? 1, 1, 9999, 1);
  const cursorDayIndex =
    params.cursorDayIndex == null
      ? null
      : clampInt(params.cursorDayIndex, 1, 9999, startDayIndex);

  const isPaused = Boolean(params.isPaused ?? false);
  const pausedReason = cleanStr(params.pausedReason) || null;

  const setsPerDay = clampInt(params.setsPerDay ?? 1, 1, 20, 1);
  // sets_per_day 가 명시되면 그만큼을 지금 오픈(배치)한다. 아니면 기존 queueSize 기본.
  const queueSize =
    params.setsPerDay != null ? setsPerDay : clampInt(params.queueSize ?? 3, 1, 20, 3);

  if (!trackId) throw new Error("trackId is required");
  if (!startDateISO) throw new Error("startDateISO is required");
  if (weekdays.length === 0) throw new Error("weekdays must have at least 1 day");

  // existing plan?
  const { data: existing } = await supabase
    .from("student_vocab_plans")
    .select("id, cursor_day_index")
    .eq("student_id", studentId)
    .eq("track_id", trackId)
    .maybeSingle();

  const nextCursor =
    cursorDayIndex ??
    ((existing as any)?.cursor_day_index != null
      ? Number((existing as any).cursor_day_index)
      : startDayIndex);

  const { data: plan, error: perr } = await supabase
    .from("student_vocab_plans")
    .upsert(
      {
        student_id: studentId,
        track_id: trackId,
        start_date: startDateISO,
        weekdays,
        max_active_sets: maxActiveSets,
        is_enabled: true,

        start_day_index: startDayIndex,
        cursor_day_index: nextCursor,
        is_paused: isPaused,
        paused_reason: pausedReason,
        sets_per_day: setsPerDay,
      } as any,
      { onConflict: "student_id,track_id" },
    )
    .select("id")
    .single();

  if (perr || !(plan as any)?.id) {
    throw new Error(
      `plan upsert failed | message: ${perr?.message ?? ""} | code: ${(perr as any)?.code ?? ""}`,
    );
  }

  const ensureRes = await ensureCockedQueueForPlan(supabase, {
    studentId,
    trackId,
    mode: "manual",
    queueSize,
  });

  return { ok: true, planId: String((plan as any).id), ensure: ensureRes };
}

/* =========================================================
 * (Admin) Cock Queue: 큐 유지
 * ======================================================= */
export async function ensureCockedQueueAdminAction(params: {
  studentId: string;
  trackId: string;
  queueSize?: number;
}) {
  const supabase = await getServerSupabase();
  await getUserOrThrow(supabase);

  const studentId = await resolveAcademyStudentIdOrThrow(supabase, params.studentId);
  const trackId = cleanStr(params.trackId);
  if (!trackId) throw new Error("trackId is required");

  const queueSize = clampInt(params.queueSize ?? 3, 1, 20, 3);

  const res = await ensureCockedQueueForPlan(supabase, {
    studentId,
    trackId,
    mode: "auto",
    queueSize,
  });
  return { ok: true, ...res };
}

/* =========================================================
 * Teacher/Manual: Assign Now (오늘 바로 오픈)
 * - open cap 무시하고 1개만 추가
 * ======================================================= */
export async function assignNextSetNowAction(params: {
  studentId: string;
  trackId: string;
}) {
  const supabase = await getServerSupabase();
  await getUserOrThrow(supabase);

  const studentId = await resolveAcademyStudentIdOrThrow(supabase, params.studentId);
  const trackId = cleanStr(params.trackId);
  if (!trackId) throw new Error("trackId is required");

  const res = await ensureCockedQueueForPlan(supabase, {
    studentId,
    trackId,
    mode: "manual",
    queueSize: 1,
  });
  return { ok: true, ...res };
}

/* =========================================================
 * 학생이 한 회차를 끝냈을 때 다음 회차 자동 할당 (오늘 바로 오픈)
 * - 전체 코스가 plan 으로 배정돼 있으므로, 완료 즉시 다음 Day 를 연다
 * - 학생 본인 동작이라 RLS 를 우회해야 하므로 service role 로 실행
 * - mode:"manual" → available_at = 오늘, open cap 무시
 * ======================================================= */
export async function advanceVocabQueueAfterCompletionAction(params: {
  studentId: string; // academy_students.id
  trackId: string;
}) {
  const studentId = cleanStr(params.studentId);
  const trackId = cleanStr(params.trackId);
  if (!studentId || !trackId) return { ok: false, reason: "MISSING_PARAMS" };

  const service = getServiceSupabase() as unknown as Supa;

  const res = await ensureCockedQueueForPlan(service, {
    studentId,
    trackId,
    mode: "manual",
    queueSize: 1,
  });
  return { ok: true, ...res };
}

/* =========================================================
 * Cancel assignment (delete) + cursor rewind + recock
 * ======================================================= */
export async function cancelStudentVocabAssignmentAction(params: {
  assignmentId: string;
  queueSize?: number;
  force?: boolean;
}) {
  const supabase = await getServerSupabase();
  await getUserOrThrow(supabase);

  const assignmentId = cleanStr(params.assignmentId);
  if (!assignmentId) throw new Error("assignmentId is required");

  const queueSize = clampInt(params.queueSize ?? 3, 1, 20, 3);
  const force = Boolean(params.force);

  const { data: row, error: rerr } = await supabase
    .from("student_vocab_assignments")
    .select("id, student_id, track_id, day_index, started_at, completed_at")
    .eq("id", assignmentId)
    .maybeSingle();

  if (rerr) throw new Error("assignment lookup failed");
  if (!(row as any)?.id) return { ok: false, error: "NOT_FOUND" };
  if (!force && (row as any).completed_at) return { ok: false, error: "ALREADY_COMPLETED" };
  if (!force && (row as any).started_at) return { ok: false, error: "ALREADY_STARTED" };

  const studentId = String((row as any).student_id);
  const trackId = String((row as any).track_id);
  const dayIndex = Number((row as any).day_index);

  // delete
  const { error: derr } = await supabase
    .from("student_vocab_assignments")
    .delete()
    .eq("id", assignmentId);

  if (derr) throw new Error("delete failed");

  // rewind cursor to this day
  const u = await supabase
    .from("student_vocab_plans")
    .update({ cursor_day_index: dayIndex } as any)
    .eq("student_id", studentId)
    .eq("track_id", trackId);

  if (u.error) throw new Error(`cursor rewind failed: ${u.error.message ?? ""}`);

  const ensureRes = await ensureCockedQueueForPlan(supabase, {
    studentId,
    trackId,
    mode: "auto",
    queueSize,
  });

  return { ok: true, canceled: assignmentId, ensure: ensureRes };
}

/* =========================================================
 * Core engine: Cocked Queue 유지
 * ======================================================= */
async function ensureCockedQueueForPlan(
  supabase: Supa,
  args: { studentId: string; trackId: string; mode: "auto" | "manual"; queueSize: number },
): Promise<EnsureCockedQueueResult> {
  const { studentId, trackId, mode } = args;
  const queueSize = clampInt(args.queueSize, 1, 20, 3);

  const { data: plan, error: perr } = await supabase
    .from("student_vocab_plans")
    .select(
      "id, start_date, weekdays, max_active_sets, is_enabled, start_day_index, cursor_day_index, is_paused",
    )
    .eq("student_id", studentId)
    .eq("track_id", trackId)
    .maybeSingle();

  if (perr) throw new Error("plan lookup failed");
  if (!(plan as any)?.id) return { assigned: false, reason: "NO_PLAN" };
  if (!(plan as any).is_enabled) return { assigned: false, reason: "PLAN_DISABLED" };
  if ((plan as any).is_paused) return { assigned: false, reason: "PAUSED" };

  const now = new Date();
  const todayISO = toISODateLocal(now);
  const todayWeekday = toISOWeekday(now);

  const startDate = parseISODate(String((plan as any).start_date));
  if (now.getTime() < startDate.getTime()) {
    return { assigned: false, reason: "BEFORE_START_DATE", todayISO, todayWeekday };
  }

  // breaks today?
  const { data: breakToday, error: berr } = await supabase
    .from("student_vocab_breaks")
    .select("id, mode, exam_track_id, start_date, end_date")
    .eq("student_id", studentId)
    .lte("start_date", todayISO)
    .gte("end_date", todayISO)
    .order("start_date", { ascending: false })
    .limit(1);

  if (berr) throw new Error("break lookup failed");

  let trackIdUsed = trackId;

  if ((breakToday as any)?.length) {
    const b = (breakToday as any)[0] as any;
    const mode2 = String(b.mode ?? "HALT");
    if (mode2 === "HALT") {
      return { assigned: false, reason: "BREAK_HALT", todayISO, todayWeekday, trackIdUsed };
    }
    if (mode2 === "SWITCH_TO_EXAM") {
      const examTrackId = cleanStr(b.exam_track_id);
      if (!examTrackId) {
        return {
          assigned: false,
          reason: "BREAK_SWITCH_NO_EXAM_TRACK",
          todayISO,
          todayWeekday,
          trackIdUsed,
        };
      }
      trackIdUsed = examTrackId;
    }
  }

  const weekdays = Array.isArray((plan as any).weekdays)
    ? ((plan as any).weekdays as any[]).map(Number)
    : [];
  const maxActive = clampInt((plan as any).max_active_sets ?? 2, 1, 20, 2);

  const startDay = clampInt((plan as any).start_day_index ?? 1, 1, 9999, 1);
  let cursor = clampInt((plan as any).cursor_day_index ?? startDay, 1, 9999, startDay);
  if (cursor < startDay) cursor = startDay;

  // Course 모델: 세트가 소속(track_id)+순서(order_index)를 스스로 가진다.
  // (구 vocab_track_sets 연결 테이블 은퇴 — 20260714000001 마이그레이션에서 백필됨)
  const { data: days, error: derr } = await supabase
    .from("vocab_sets")
    .select("order_index, id")
    .eq("track_id", trackIdUsed)
    .not("order_index", "is", null)
    .order("order_index", { ascending: true });

  if (derr) throw new Error("course sets lookup failed");
  if (!(days as any)?.length) {
    return { assigned: false, reason: "NO_DAYS", todayISO, todayWeekday, trackIdUsed };
  }

  const setMap = new Map<number, string>();
  for (const d of (days as any[]) ?? []) {
    setMap.set(Number((d as any).order_index), String((d as any).id));
  }
  const totalDays = Math.max(...Array.from(setMap.keys()));

  // existing assignments for this track
  const { data: allRows, error: aerr } = await supabase
    .from("student_vocab_assignments")
    .select("id, day_index, available_at, started_at, completed_at")
    .eq("student_id", studentId)
    .eq("track_id", trackIdUsed)
    .order("day_index", { ascending: true })
    .limit(2000);

  if (aerr) throw new Error("assignments lookup failed");

  const activeRows = ((allRows as any[]) ?? []).filter((r: any) => r.completed_at == null);
  const completedDays = new Set<number>(
    ((allRows as any[]) ?? [])
      .filter((r: any) => r.completed_at != null)
      .map((r: any) => Number(r.day_index)),
  );
  const activeDays = new Set<number>(activeRows.map((r: any) => Number(r.day_index)));

  let queueCount = activeRows.length;
  let unlockedCount = activeRows.filter((r: any) => String(r.available_at) <= todayISO).length;

  // last available date among active
  let lastAvailISO = todayISO;
  for (const r of activeRows as any[]) {
    const a = String(r.available_at ?? "");
    if (a && a > lastAvailISO) lastAvailISO = a;
  }

  const created: Array<{ assignmentId: string; dayIndex: number; setId: string; availableAt: string }> =
    [];

  // helper: compute available_at for next queued item
  const computeNextAvailable = (isFirstNew: boolean) => {
    if (mode === "manual") return todayISO;

    if (queueCount === 0 && isFirstNew) {
      return nextScheduledISODateLocal(now, weekdays);
    }
    return nextScheduledISODateAfterISO(lastAvailISO, weekdays);
  };

  // fill queue up to queueSize
  let guard = 0;
  let assignedCount = 0;

  while (queueCount < queueSize) {
    guard++;
    if (guard > totalDays + 20) {
      return {
        assigned: false,
        reason: "GUARD_BREAK",
        todayISO,
        todayWeekday,
        queueSize,
        queueCount,
        unlockedCount,
        maxActive,
        cursor,
        startDay,
        trackIdUsed,
      };
    }

    if (cursor > totalDays) {
      // update cursor (end) and stop
      await supabase
        .from("student_vocab_plans")
        .update({ cursor_day_index: cursor } as any)
        .eq("student_id", studentId)
        .eq("track_id", trackId);
      break;
    }

    // skip completed
    if (completedDays.has(cursor)) {
      cursor++;
      continue;
    }

    // skip if already in queue
    if (activeDays.has(cursor)) {
      cursor++;
      continue;
    }

    const setId = setMap.get(cursor);
    if (!setId) {
      cursor++;
      continue;
    }

    // ✅ 빈 set은 여기서 막는다 (fallback 원천 차단)
    const cnt = await getSetItemCount(supabase, setId);
    if (cnt <= 0) {
      return {
        assigned: false,
        reason: "EMPTY_SET",
        todayISO,
        todayWeekday,
        queueSize,
        queueCount,
        unlockedCount,
        maxActive,
        cursor,
        startDay,
        trackIdUsed,
        note: `day=${cursor} setId=${setId} has 0 items`,
      };
    }

    let availableAt = computeNextAvailable(created.length === 0);

    // open cap only applies to "open now" items
    if (mode === "auto" && availableAt <= todayISO && unlockedCount >= maxActive) {
      availableAt = nextScheduledISODateAfterISO(todayISO, weekdays);
    }

    const payload = {
      student_id: studentId,
      track_id: trackIdUsed,
      day_index: cursor,
      set_id: setId,
      status: "ASSIGNED",
      available_at: availableAt,
      note:
        mode === "manual"
          ? `manual-assign track:${trackIdUsed} day:${pad2(cursor)}`
          : `auto-queue track:${trackIdUsed} day:${pad2(cursor)}`,
    } as any;

    const { data: inserted, error: insErr } = await supabase
      .from("student_vocab_assignments")
      .insert(payload)
      .select("id")
      .single();

    if (insErr || !(inserted as any)?.id) {
      return {
        assigned: false,
        reason: "INSERT_FAILED",
        todayISO,
        todayWeekday,
        queueSize,
        queueCount,
        unlockedCount,
        maxActive,
        cursor,
        startDay,
        trackIdUsed,
        note: insErr?.message ?? "unknown",
      };
    }

    assignedCount++;
    queueCount++;
    if (availableAt <= todayISO) unlockedCount++;
    if (availableAt > lastAvailISO) lastAvailISO = availableAt;

    created.push({
      assignmentId: String((inserted as any).id),
      dayIndex: cursor,
      setId,
      availableAt,
    });

    // advance cursor after successful creation
    cursor++;
  }

  // persist cursor (so next call continues)
  await supabase
    .from("student_vocab_plans")
    .update({ cursor_day_index: cursor } as any)
    .eq("student_id", studentId)
    .eq("track_id", trackId);

  return {
    assigned: assignedCount > 0,
    reason: assignedCount > 0 ? null : "NO_AVAILABLE_DAYS",
    assignedCount,
    created,
    todayISO,
    todayWeekday,
    queueSize,
    queueCount,
    unlockedCount,
    maxActive,
    cursor,
    startDay,
    trackIdUsed,
  };
}

/* =========================================================
 * Admin helpers
 * ======================================================= */

async function assertAdminOrThrow2(supabase: Supa) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) throw new Error("Login required");

  const { data: profile, error: perr } = await supabase
    .from("profiles")
    .select("id, is_admin, role")
    .eq("id", user.id)
    .maybeSingle();

  if (perr) throw new Error("Failed to verify admin role (profiles)");

  const isAdmin =
    Boolean((profile as any)?.is_admin) ||
    String((profile as any)?.role ?? "").toLowerCase() === "admin";

  if (!isAdmin) throw new Error("Admin only");
  return user;
}

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function chunkArr<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/* =========================================================
 * ✅ Admin: Recock all plans for a track
 * - Deletes NOT-started & NOT-completed assignments (so mapping changes reflect)
 * - Rewinds cursor to earliest deleted day (so we don't skip)
 * - Then recocks via ensureCockedQueueForPlan(auto)
 * ======================================================= */
export async function recockAllPlansForTrackAction(params: {
  trackId: string;
  queueSize?: number;
  dryRun?: boolean;
}) {
  const supabase = await getServerSupabase();
  await assertAdminOrThrow2(supabase);

  const trackId = cleanStr(params.trackId);
  if (!trackId) throw new Error("trackId is required");

  const queueSize = clampInt(params.queueSize ?? 3, 1, 20, 3);
  const dryRun = Boolean(params.dryRun ?? false);

  const { data: plans, error: perr } = await supabase
    .from("student_vocab_plans")
    .select("student_id, track_id, cursor_day_index, start_day_index, is_enabled, is_paused")
    .eq("track_id", trackId)
    .limit(5000);

  if (perr) throw new Error(`plan list failed: ${perr.message ?? ""}`);

  const list = (plans as any[]) ?? [];
  const results: any[] = [];

  for (const chunk of chunkArr(list, 10)) {
    const batch = await Promise.all(
      chunk.map(async (p: any) => {
        const studentId = String(p.student_id ?? "").trim();
        if (!studentId) return { ok: false, reason: "NO_STUDENT_ID" };

        let deletedCount = 0;
        let minDeleted: number | null = null;
        let rewoundTo: number | null = null;
        let ensure: any = null;

        if (!dryRun) {
          const { data: deletedRows, error: derr } = await supabase
            .from("student_vocab_assignments")
            .delete()
            .eq("student_id", studentId)
            .eq("track_id", trackId)
            .is("started_at", null)
            .is("completed_at", null)
            .select("day_index");

          if (derr) {
            return { ok: false, studentId, reason: "DELETE_FAILED", note: derr.message ?? "" };
          }

          const del = (deletedRows as any[]) ?? [];
          deletedCount = del.length;
          if (deletedCount > 0) minDeleted = Math.min(...del.map((r: any) => Number(r.day_index)));

          if (minDeleted != null && Number.isFinite(minDeleted)) {
            const currentCursor = clampInt(p.cursor_day_index ?? minDeleted, 1, 9999, minDeleted);
            const newCursor = Math.min(currentCursor, minDeleted);

            const { error: uerr } = await supabase
              .from("student_vocab_plans")
              .update({ cursor_day_index: newCursor } as any)
              .eq("student_id", studentId)
              .eq("track_id", trackId);

            if (uerr) {
              return {
                ok: false,
                studentId,
                reason: "CURSOR_REWIND_FAILED",
                note: uerr.message ?? "",
              };
            }
            rewoundTo = newCursor;
          }

          ensure = await ensureCockedQueueForPlan(supabase, {
            studentId,
            trackId,
            mode: "auto",
            queueSize,
          });
        }

        return { ok: true, studentId, deletedCount, minDeleted, rewoundTo, ensure, dryRun };
      }),
    );

    results.push(...batch);
  }

  const okCount = results.filter((r) => r?.ok).length;
  const failCount = results.length - okCount;

  return { ok: true, trackId, queueSize, dryRun, totalPlans: results.length, okCount, failCount, results };
}

/* =========================================================
 * Admin: Single Active Track (hide duplicates)
 * - if is_active column missing: returns ok:false + reason
 * ======================================================= */
export async function setSingleActiveVocabTrackAction(params: {
  activeTrackId: string; // keep only this one active
}) {
  const supabase = await getServerSupabase();
  await assertAdminOrThrow2(supabase);

  const activeTrackId = cleanStr(params.activeTrackId);
  if (!activeTrackId) throw new Error("activeTrackId is required");

  // if column doesn't exist, this update will error with 42703
  const r = await supabase
    .from("vocab_tracks")
    .update({ is_active: false } as any)
    .neq("id", activeTrackId);

  if (r.error) {
    const code = String((r.error as any)?.code ?? "");
    if (code === "42703") {
      return { ok: false as const, reason: "NO_IS_ACTIVE_COLUMN" };
    }
    throw new Error(`deactivate failed: ${r.error.message ?? ""}`);
  }

  const r2 = await supabase
    .from("vocab_tracks")
    .update({ is_active: true } as any)
    .eq("id", activeTrackId);

  if (r2.error) throw new Error(`activate failed: ${r2.error.message ?? ""}`);

  return { ok: true as const, activeTrackId };
}

/* =========================================================
 * Admin repair: Neungyul tracks (one-shot)
 * ======================================================= */
export async function repairNeungyulTracksAction(params?: {
  /** source track (good) */
  sourceTrackId?: string; // default: 61ce...
  /** targets to repair */
  targetTrackIds?: string[]; // default: [3df...]
  /** ensure queue size (recock) */
  queueSize?: number; // default 3
  /** if true, do not mutate; just report */
  dryRun?: boolean;
}) {
  const supabase = await getServerSupabase();
  await assertAdminOrThrow2(supabase);

  // defaults: copy from good(60 days) -> broken(1 day)
  const sourceTrackId = String(
    params?.sourceTrackId ?? "61cefafb-fe6a-485a-a092-eeff12bd6aab",
  ).trim();

  const targetTrackIds = (params?.targetTrackIds ?? [
    "3df952aa-2fe0-4eac-9861-476af55a9ddb",
  ])
    .map((x) => String(x).trim())
    .filter(Boolean);

  const queueSize = clampInt(params?.queueSize ?? 3, 1, 20, 3);
  const dryRun = Boolean(params?.dryRun ?? false);

  if (!sourceTrackId) throw new Error("sourceTrackId is required");
  if (targetTrackIds.length === 0) throw new Error("targetTrackIds is required");

  /* -----------------------------------------
   * (A) load source day_index -> set_id map
   * --------------------------------------- */
  const { data: srcRows, error: sErr } = await supabase
    .from("vocab_track_sets")
    .select("day_index, set_id")
    .eq("track_id", sourceTrackId)
    .order("day_index", { ascending: true });

  if (sErr) throw new Error(`source vocab_track_sets lookup failed: ${sErr.message ?? ""}`);

  const srcMap = new Map<number, string>();
  for (const r of (srcRows ?? []) as any[]) {
    const day = Number(r?.day_index);
    const setId = String(r?.set_id ?? "");
    if (!Number.isFinite(day) || day < 1) continue;
    if (!setId) continue;
    srcMap.set(day, setId);
  }

  if (srcMap.size === 0) {
    throw new Error("source track has no vocab_track_sets rows (srcMap empty)");
  }

  const srcDays = Array.from(srcMap.keys()).sort((a, b) => a - b);
  const srcMinDay = srcDays[0] ?? 1;
  const srcMaxDay = srcDays[srcDays.length - 1] ?? 1;

  /* -----------------------------------------
   * (B) compute empty set ids for target tracks
   * --------------------------------------- */
  const { data: tRows, error: tErr } = await supabase
    .from("vocab_track_sets")
    .select("track_id, day_index, set_id")
    .in("track_id", targetTrackIds);

  if (tErr) throw new Error(`target vocab_track_sets lookup failed: ${tErr.message ?? ""}`);

  const targetSetIds = uniq(
    (tRows ?? [])
      .map((r: any) => String(r?.set_id ?? "").trim())
      .filter(Boolean),
  );

  // count items per set_id (client-side)
  const itemCounts = new Map<string, number>();
  if (targetSetIds.length > 0) {
    for (const part of chunkArr(targetSetIds, 500)) {
      const { data: items, error: iErr } = await supabase
        .from("vocab_set_items")
        .select("set_id")
        .in("set_id", part);

      if (iErr) throw new Error(`vocab_set_items lookup failed: ${iErr.message ?? ""}`);

      for (const it of (items ?? []) as any[]) {
        const sid = String(it?.set_id ?? "").trim();
        if (!sid) continue;
        itemCounts.set(sid, (itemCounts.get(sid) ?? 0) + 1);
      }
    }
  }

  const emptySetIds = targetSetIds.filter((sid) => (itemCounts.get(sid) ?? 0) === 0);

  /* -----------------------------------------
   * (1) delete empty assignments (safe: only not-started & not-completed)
   * --------------------------------------- */
  let deletedAssignmentCount = 0;
  let deletedAssignmentIds: string[] = [];

  if (emptySetIds.length > 0) {
    const { data: badAsg, error: aErr } = await supabase
      .from("student_vocab_assignments")
      .select("id, student_id, track_id, day_index, set_id, started_at, completed_at")
      .in("track_id", targetTrackIds)
      .in("set_id", emptySetIds)
      .is("started_at", null)
      .is("completed_at", null)
      .limit(5000);

    if (aErr) throw new Error(`assignments lookup failed: ${aErr.message ?? ""}`);

    const badIds = uniq((badAsg ?? []).map((r: any) => String(r?.id ?? "")).filter(Boolean));
    deletedAssignmentIds = badIds;

    if (!dryRun && badIds.length > 0) {
      for (const part of chunkArr(badIds, 200)) {
        const { error: dErr } = await supabase
          .from("student_vocab_assignments")
          .delete()
          .in("id", part);

        if (dErr) throw new Error(`delete assignments failed: ${dErr.message ?? ""}`);
        deletedAssignmentCount += part.length;
      }
    }
  }

  /* -----------------------------------------
   * (2) replace target vocab_track_sets with source map (day_index match)
   * --------------------------------------- */
  let upsertedTrackSets = 0;
  const trackSetUpserts: Array<{ track_id: string; day_index: number; set_id: string }> = [];

  for (const tid of targetTrackIds) {
    for (const [day, setId] of srcMap.entries()) {
      trackSetUpserts.push({ track_id: tid, day_index: day, set_id: setId });
    }
  }

  if (!dryRun && trackSetUpserts.length > 0) {
    for (const part of chunkArr(trackSetUpserts, 500)) {
      const { error: uErr } = await supabase
        .from("vocab_track_sets")
        .upsert(part as any, { onConflict: "track_id,day_index" });

      if (uErr) throw new Error(`vocab_track_sets upsert failed: ${uErr.message ?? ""}`);
      upsertedTrackSets += part.length;
    }

    await supabase
      .from("vocab_tracks")
      .update({ total_days: srcMaxDay } as any)
      .in("id", targetTrackIds);
  }

  /* -----------------------------------------
   * (3) ensureQueue for all students with enabled plans on target tracks
   * --------------------------------------- */
  const { data: plans, error: pErr } = await supabase
    .from("student_vocab_plans")
    .select("student_id, track_id, is_enabled, is_paused")
    .in("track_id", targetTrackIds)
    .limit(5000);

  if (pErr) throw new Error(`student_vocab_plans lookup failed: ${pErr.message ?? ""}`);

  const planPairs = (plans ?? [])
    .filter((r: any) => Boolean(r?.is_enabled) && !Boolean(r?.is_paused))
    .map((r: any) => ({
      studentId: String(r?.student_id ?? "").trim(),
      trackId: String(r?.track_id ?? "").trim(),
    }))
    .filter((x) => x.studentId && x.trackId);

  // de-dupe (student_id, track_id)
  const keySet = new Set<string>();
  const uniquePairs: typeof planPairs = [];
  for (const p of planPairs) {
    const k = `${p.studentId}::${p.trackId}`;
    if (keySet.has(k)) continue;
    keySet.add(k);
    uniquePairs.push(p);
  }

  const ensureResults: Array<{
    studentId: string;
    trackId: string;
    assigned: boolean;
    assignedCount?: number;
    reason?: string;
    note?: string;
  }> = [];

  if (!dryRun) {
    for (const pair of uniquePairs) {
      try {
        const res = await ensureCockedQueueForPlan(supabase, {
          studentId: pair.studentId,
          trackId: pair.trackId,
          mode: "auto",
          queueSize,
        });

        if ((res as any).assigned === false) {
          ensureResults.push({
            studentId: pair.studentId,
            trackId: pair.trackId,
            assigned: false,
            reason: (res as any).reason,
            note: (res as any).note,
          });
        } else {
          ensureResults.push({
            studentId: pair.studentId,
            trackId: pair.trackId,
            assigned: true,
            assignedCount: (res as any).assignedCount ?? 0,
          });
        }
      } catch (e: any) {
        ensureResults.push({
          studentId: pair.studentId,
          trackId: pair.trackId,
          assigned: false,
          reason: "EXCEPTION",
          note: e?.message ?? "unknown",
        });
      }
    }
  }

  return {
    ok: true as const,
    dryRun,
    sourceTrackId,
    targetTrackIds,
    sourceDayRange: { min: srcMinDay, max: srcMaxDay, count: srcMap.size },

    emptySetIdsCount: emptySetIds.length,
    emptySetIds: emptySetIds.slice(0, 50),

    deletedAssignmentCount,
    deletedAssignmentIds: deletedAssignmentIds.slice(0, 50),

    upsertedTrackSets,

    ensuredPlanPairs: uniquePairs.length,
    ensureResults: ensureResults.slice(0, 50),
  };
}

/* =========================================================
 * Admin: Sync imported Day sets -> vocab_track_sets
 *
 * - Import가 만든 vocab_sets (title/description 기반)에서 Day index를 파싱
 * - vocab_tracks upsert (없으면 생성)
 * - vocab_track_sets upsert (track_id, day_index)
 * - 빈 set(아이템 0개)은 스킵/리포트
 * - is_active 컬럼이 있으면 true로 켜줌 (best-effort)
 * - (옵션) recockStudents=true면 해당 트랙 학생 큐를 재정렬
 * ======================================================= */

function parseDayIndexFromSetTitle(title: string): number | null {
  const t = cleanStr(title);
  if (!t) return null;

  // "Day 01", "DAY-1", "day_003" 등
  const m = t.match(/day[\s\-_]*0*([0-9]{1,4})/i);
  if (!m) return null;

  const n = Number(m[1]);
  if (!Number.isFinite(n) || n < 1) return null;
  return n;
}

async function resolveTrackIdByIdOrSlugOrThrow(supabase: Supa, key: string): Promise<string> {
  const k = cleanStr(key);
  if (!k) throw new Error("trackKey is required");

  // 1) by id
  const r1 = await supabase.from("vocab_tracks").select("id").eq("id", k).maybeSingle();
  if (!r1.error && (r1.data as any)?.id) return String((r1.data as any).id);

  // 2) by slug
  const r2 = await supabase.from("vocab_tracks").select("id").eq("slug", k).maybeSingle();
  if (!r2.error && (r2.data as any)?.id) return String((r2.data as any).id);

  throw new Error("Track not found by id or slug");
}

export async function syncImportedDaySetsToTrackAction(params: {
  /** track id OR slug. if not found and createIfMissing=true => will create by slug */
  trackKey: string;

  /** when creating missing track (trackKey treated as slug) */
  createIfMissing?: boolean;
  trackTitleIfCreate?: string;
  trackDescriptionIfCreate?: string | null;

  /**
   * Which vocab_sets to scan:
   * - titlePrefix: "능률보카 어원편"  -> title ilike "능률보카 어원편%"
   * - or queryText: "능률보카"       -> (title ilike %q% OR description ilike %q%)
   */
  titlePrefix?: string;
  queryText?: string;

  /** safety: max rows to scan */
  limit?: number;

  /** if true: only report, no mutation */
  dryRun?: boolean;

  /** OPTIONAL: after upsert, recock students using this track */
  recockStudents?: boolean;
  recockQueueSize?: number;
}) {
  const supabase = await getServerSupabase();
  await assertAdminOrThrow2(supabase);

  const trackKey = cleanStr(params.trackKey);
  if (!trackKey) throw new Error("trackKey is required");

  const dryRun = Boolean(params.dryRun ?? false);
  const limit = clampInt(params.limit ?? 2000, 50, 5000, 2000);

  const titlePrefix = cleanStr(params.titlePrefix);
  const queryText = cleanStr(params.queryText);

  if (!titlePrefix && !queryText) {
    throw new Error("Need at least one filter: titlePrefix or queryText");
  }

  // -------------------------------------------------------
  // (1) resolve or create track
  // -------------------------------------------------------
  let trackId: string | null = null;

  try {
    trackId = await resolveTrackIdByIdOrSlugOrThrow(supabase, trackKey);
  } catch {
    if (!params.createIfMissing) throw new Error("Track not found (and createIfMissing=false)");

    // create by slug (=trackKey)
    const slug = trackKey;
    const title = cleanStr(params.trackTitleIfCreate) || slug;
    const description = cleanStr(params.trackDescriptionIfCreate) || null;

    // best effort: include is_active
    const r1 = await supabase
      .from("vocab_tracks")
      .upsert(
        { slug, title, description, total_days: 0, is_active: true } as any,
        { onConflict: "slug" },
      )
      .select("id")
      .single();

    if (!r1.error && (r1.data as any)?.id) {
      trackId = String((r1.data as any).id);
    } else {
      const code = String((r1.error as any)?.code ?? "");
      if (code === "42703") {
        const r2 = await supabase
          .from("vocab_tracks")
          .upsert({ slug, title, description, total_days: 0 } as any, { onConflict: "slug" })
          .select("id")
          .single();

        if (r2.error || !(r2.data as any)?.id)
          throw new Error(`track create failed: ${r2.error?.message ?? ""}`);
        trackId = String((r2.data as any).id);
      } else {
        throw new Error(`track create failed: ${r1.error?.message ?? ""}`);
      }
    }
  }

  if (!trackId) throw new Error("trackId resolve failed");

  // -------------------------------------------------------
  // (2) fetch candidate sets
  // -------------------------------------------------------
  let q = supabase
    .from("vocab_sets")
    .select("id, title, description, created_at")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (titlePrefix) {
    q = q.ilike("title", `${titlePrefix}%`);
  } else if (queryText) {
    // title contains OR description contains
    // supabase or() uses comma-separated filters
    const esc = queryText.replace(/,/g, ""); // defensive
    q = q.or(`title.ilike.%${esc}%,description.ilike.%${esc}%`);
  }

  const { data: sets, error: sErr } = await q;
  if (sErr) throw new Error(`vocab_sets scan failed: ${sErr.message ?? ""}`);

  const rows = (sets ?? []) as any[];

  // -------------------------------------------------------
  // (3) build day -> set (pick latest created_at per day)
  // -------------------------------------------------------
  const dayToSet = new Map<number, { setId: string; title: string; createdAt: string }>();
  const unparsable: Array<{ id: string; title: string }> = [];
  const dupDays: Array<{ day: number; kept: string; dropped: string }> = [];

  for (const r of rows) {
    const setId = String(r?.id ?? "").trim();
    const title = String(r?.title ?? "");
    const createdAt = String(r?.created_at ?? "");

    const day = parseDayIndexFromSetTitle(title);
    if (!setId || !day) {
      if (setId && title) unparsable.push({ id: setId, title });
      continue;
    }

    const prev = dayToSet.get(day);
    if (!prev) {
      dayToSet.set(day, { setId, title, createdAt });
      continue;
    }

    // keep the later one
    if (createdAt && prev.createdAt && createdAt > prev.createdAt) {
      dupDays.push({ day, kept: setId, dropped: prev.setId });
      dayToSet.set(day, { setId, title, createdAt });
    } else {
      dupDays.push({ day, kept: prev.setId, dropped: setId });
    }
  }

  const dayIndexes = Array.from(dayToSet.keys()).sort((a, b) => a - b);
  if (dayIndexes.length === 0) {
    return {
      ok: false as const,
      reason: "NO_DAY_SETS_FOUND",
      trackId,
      scanned: rows.length,
      unparsable: unparsable.slice(0, 30),
    };
  }

  // -------------------------------------------------------
  // (4) verify non-empty sets + build upserts
  // -------------------------------------------------------
  const upserts: Array<{ track_id: string; day_index: number; set_id: string }> = [];
  const emptyDays: Array<{ day: number; setId: string; title: string }> = [];

  const allSetIds = dayIndexes.map((day) => dayToSet.get(day)!.setId);
  const { data: nonEmptyRows, error: cntErr } = await (supabase as any)
    .from("vocab_set_items")
    .select("set_id")
    .in("set_id", allSetIds);
  if (cntErr) throw new Error(`vocab_set_items batch check failed: ${cntErr.message ?? ""}`);
  const nonEmptySetIds = new Set((nonEmptyRows ?? []).map((r: any) => String(r.set_id)));

  for (const day of dayIndexes) {
    const info = dayToSet.get(day)!;
    if (!nonEmptySetIds.has(info.setId)) {
      emptyDays.push({ day, setId: info.setId, title: info.title });
      continue;
    }
    upserts.push({ track_id: trackId, day_index: day, set_id: info.setId });
  }

  const maxDay = upserts.reduce((mx, r) => Math.max(mx, r.day_index), 0);

  // -------------------------------------------------------
  // (5) mutate (upsert links + update track total_days + is_active)
  // -------------------------------------------------------
  let upserted = 0;

  if (!dryRun && upserts.length > 0) {
    for (const part of chunkArr(upserts, 500)) {
      const { error: uErr } = await supabase
        .from("vocab_track_sets")
        .upsert(part as any, { onConflict: "track_id,day_index" });

      if (uErr) throw new Error(`vocab_track_sets upsert failed: ${uErr.message ?? ""}`);
      upserted += part.length;

      // ✅ Course 모델(신규 소스): 세트에 소속(track_id)+순서(order_index) 직접 반영
      for (const row of part) {
        const { error: sErr2 } = await supabase
          .from("vocab_sets")
          .update({ track_id: row.track_id, order_index: row.day_index } as any)
          .eq("id", row.set_id);
        if (sErr2) throw new Error(`vocab_sets link failed (day ${row.day_index}): ${sErr2.message}`);
      }
    }

    // total_days update
    if (maxDay > 0) {
      await supabase.from("vocab_tracks").update({ total_days: maxDay } as any).eq("id", trackId);
    }

    // best-effort is_active=true
    const rAct = await supabase.from("vocab_tracks").update({ is_active: true } as any).eq("id", trackId);
    if (rAct.error) {
      const code = String((rAct.error as any)?.code ?? "");
      // ignore missing column
      if (code !== "42703") throw new Error(`track activate failed: ${rAct.error.message ?? ""}`);
    }
  }

  // OPTIONAL: recock
  const recockStudents = Boolean(params.recockStudents ?? false);
  const recockQueueSize = clampInt(params.recockQueueSize ?? 3, 1, 20, 3);

  let recockSummary: any = null;
  if (!dryRun && recockStudents) {
    recockSummary = await recockAllPlansForTrackAction({
      trackId,
      queueSize: recockQueueSize,
      dryRun: false,
    });
  }

  return {
    ok: true as const,
    dryRun,
    trackId,
    scanned: rows.length,
    foundDayCount: dayIndexes.length,
    linkableDayCount: upserts.length,
    upserted,

    maxDay,

    emptyDaysCount: emptyDays.length,
    emptyDays: emptyDays.slice(0, 30),

    dupDaysCount: dupDays.length,
    dupDays: dupDays.slice(0, 30),

    unparsableCount: unparsable.length,
    unparsable: unparsable.slice(0, 30),

    recockSummary,
  };
}

/* =========================================================
 * Bulk: 여러 학생에게 동일 트랙 플랜 한번에 배포
 * ======================================================= */
export type BulkPlanResult = {
  ok: true;
  total: number;
  succeeded: number;
  failed: number;
  results: Array<{ studentId: string; name: string; ok: boolean; error?: string }>;
};

export async function bulkCreateStudentVocabPlansAction(params: {
  studentIds: string[];
  trackId: string;
  startDateISO: string;
  weekdays: number[];
  maxActiveSets?: number;
  startDayIndex?: number;
  queueSize?: number;
}): Promise<BulkPlanResult | { ok: false; error: string }> {
  try {
    const supabase = await getServerSupabase();
    await getUserOrThrow(supabase);

    const trackId = cleanStr(params.trackId);
    if (!trackId) return { ok: false, error: "trackId required" };
    if (!params.studentIds?.length) return { ok: false, error: "studentIds required" };

    const weekdays = (params.weekdays ?? []).map(Number).filter((n) => n >= 1 && n <= 7);
    if (weekdays.length === 0) return { ok: false, error: "weekdays required" };

    const startDateISO = cleanStr(params.startDateISO);
    const maxActiveSets = clampInt(params.maxActiveSets ?? 2, 1, 20, 2);
    const startDayIndex = clampInt(params.startDayIndex ?? 1, 1, 9999, 1);
    const queueSize = clampInt(params.queueSize ?? 3, 1, 20, 3);

    const { data: studentRows } = await supabase
      .from("academy_students")
      .select("id, full_name")
      .in("id", params.studentIds);

    const nameMap = new Map<string, string>(
      (studentRows ?? []).map((r: any) => [String(r.id), String(r.full_name ?? r.id)]),
    );

    const results: BulkPlanResult["results"] = [];

    for (const rawId of params.studentIds) {
      const name = nameMap.get(rawId) ?? rawId;
      try {
        // rawId is already an academy_students.id (confirmed by the batch fetch above)
        const studentId = rawId;

        const { data: plan, error: perr } = await supabase
          .from("student_vocab_plans")
          .upsert(
            {
              student_id: studentId,
              track_id: trackId,
              start_date: startDateISO,
              weekdays,
              max_active_sets: maxActiveSets,
              is_enabled: true,
              start_day_index: startDayIndex,
              cursor_day_index: startDayIndex,
              is_paused: false,
              paused_reason: null,
            } as any,
            { onConflict: "student_id,track_id" },
          )
          .select("id")
          .single();

        if (perr || !(plan as any)?.id) {
          results.push({ studentId, name, ok: false, error: perr?.message ?? "upsert failed" });
          continue;
        }

        await ensureCockedQueueForPlan(supabase, { studentId, trackId, mode: "auto", queueSize });
        results.push({ studentId, name, ok: true });
      } catch (e: any) {
        results.push({ studentId: rawId, name, ok: false, error: e?.message ?? "unknown" });
      }
    }

    const succeeded = results.filter((r) => r.ok).length;
    return { ok: true, total: results.length, succeeded, failed: results.length - succeeded, results };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "bulk assign failed" };
  }
}
