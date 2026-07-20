import type { SupabaseClient } from "@supabase/supabase-js";

type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type StudentActivityTrack = "naesin" | "junior" | "toefl" | "voca";
type StudentActivityType =
  | "assignment"
  | "reading_session"
  | "vocab_session"
  | "review"
  | "homework";
type StudentActivityStatus =
  | "todo"
  | "in_progress"
  | "done"
  | "skipped"
  | "archived";

type SyncSuccess = { ok: true; id: string };
type SyncFailure = { ok: false; error: string };
type SyncResult = SyncSuccess | SyncFailure;

type BatchSyncSuccess = { ok: true; synced: number };
type BatchSyncFailure = { ok: false; error: string; synced: number };
type BatchSyncResult = BatchSyncSuccess | BatchSyncFailure;

type LooseRow = Record<string, unknown>;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asIsoDateTime(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function normalizeTrack(value: unknown): StudentActivityTrack | null {
  const s = asString(value)?.toLowerCase();
  if (!s) return null;

  if (s === "naesin") return "naesin";
  if (s === "junior") return "junior";
  if (s === "toefl") return "toefl";
  if (s === "voca" || s === "vocab" || s === "lingo_vocab") return "voca";

  return null;
}

function normalizeTaskKindToTrack(kind: unknown): StudentActivityTrack | null {
  const s = asString(kind)?.toUpperCase();
  if (!s) return null;

  if (s === "LINGO_VOCAB" || s === "VOCA" || s === "VOCAB") return "voca";
  if (s === "TOEFL") return "toefl";
  if (s === "NAESIN") return "naesin";
  if (s === "JUNIOR") return "junior";

  return null;
}

function normalizeSection(value: unknown): string | null {
  const s = asString(value)?.toLowerCase();
  if (!s) return null;
  return s;
}

function normalizeTaskStatus(value: unknown): StudentActivityStatus {
  const s = asString(value)?.toLowerCase();

  if (s === "done") return "done";
  if (s === "in_progress") return "in_progress";
  if (s === "skipped") return "skipped";
  if (s === "archived") return "archived";
  return "todo";
}

function normalizeReadingStatus(row: LooseRow): StudentActivityStatus {
  if (row.completed_at) return "done";
  if (row.started_at) return "in_progress";
  return "todo";
}

function extractTaskTrack(row: LooseRow): StudentActivityTrack {
  const payload = asRecord(row.payload_json);
  const spec = asRecord(payload?.spec);

  return (
    normalizeTrack(spec?.track) ??
    normalizeTrack(spec?.program) ??
    normalizeTrack(spec?.curriculumType) ??
    normalizeTrack(spec?.course) ??
    normalizeTaskKindToTrack(row.kind) ??
    "naesin"
  );
}

function extractTaskSection(row: LooseRow): string | null {
  const payload = asRecord(row.payload_json);
  const spec = asRecord(payload?.spec);

  return (
    normalizeSection(spec?.section) ??
    normalizeSection(spec?.area) ??
    normalizeSection(spec?.subject) ??
    null
  );
}

function extractReadingTrack(row: LooseRow): StudentActivityTrack {
  const meta = asRecord(row.meta);
  return normalizeTrack(meta?.track) ?? "naesin";
}

function buildTaskActivityMeta(row: LooseRow): Record<string, Json> {
  const payload = asRecord(row.payload_json);
  const spec = asRecord(payload?.spec);

  return {
    sourceKind: asString(row.kind),
    priority: asString(row.priority),
    rawStatus: asString(row.status),
    assignmentId: asString(payload?.assignmentId),
    spec: (spec as Json | undefined) ?? null,
    payload: (payload as Json | undefined) ?? null,
  };
}

function buildReadingActivityMeta(row: LooseRow): Record<string, Json> {
  const meta = asRecord(row.meta);

  return {
    rawMeta: (meta as Json | undefined) ?? null,
    sessionMode: asString(meta?.mode),
    testId: asString(row.test_id) ?? asString(meta?.testId),
    passageId: asString(row.passage_id),
    sessionKind: "reading",
  };
}

async function upsertActivityBySource(
  supabase: SupabaseClient,
  input: {
    studentId: string;
    activityType: StudentActivityType;
    track: StudentActivityTrack;
    section: string | null;
    status: StudentActivityStatus;
    sourceTable: string;
    sourceId: string;
    title: string | null;
    description: string | null;
    score?: number | null;
    accuracy?: number | null;
    startedAt?: string | null;
    completedAt?: string | null;
    dueAt?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    meta?: Record<string, Json>;
  },
): Promise<SyncResult> {
  const existing = await supabase
    .from("student_activities")
    .select("id")
    .eq("source_table", input.sourceTable)
    .eq("source_id", input.sourceId)
    .limit(1)
    .maybeSingle();

  if (existing.error) {
    return { ok: false, error: existing.error.message };
  }

  const payload = {
    student_id: input.studentId,
    activity_type: input.activityType,
    track: input.track,
    section: input.section,
    status: input.status,
    source_table: input.sourceTable,
    source_id: input.sourceId,
    title: input.title,
    description: input.description,
    score: input.score ?? null,
    accuracy: input.accuracy ?? null,
    started_at: input.startedAt ?? null,
    completed_at: input.completedAt ?? null,
    due_at: input.dueAt ?? null,
    created_at: input.createdAt ?? new Date().toISOString(),
    updated_at: input.updatedAt ?? new Date().toISOString(),
    meta: input.meta ?? {},
  };

  if (existing.data?.id) {
    const updated = await supabase
      .from("student_activities")
      .update(payload)
      .eq("id", existing.data.id)
      .select("id")
      .single();

    if (updated.error) {
      return { ok: false, error: updated.error.message };
    }

    return { ok: true, id: updated.data.id as string };
  }

  const inserted = await supabase
    .from("student_activities")
    .insert(payload)
    .select("id")
    .single();

  if (inserted.error) {
    return { ok: false, error: inserted.error.message };
  }

  return { ok: true, id: inserted.data.id as string };
}

export async function syncStudentTaskActivityById(
  supabase: SupabaseClient,
  taskId: string,
): Promise<SyncResult> {
  const taskRes = await supabase
    .from("student_tasks")
    .select("*")
    .eq("id", taskId)
    .single();

  if (taskRes.error) {
    return { ok: false, error: taskRes.error.message };
  }

  const row = taskRes.data as LooseRow;
  const studentId = asString(row.student_id);

  if (!studentId) {
    return { ok: false, error: "student_tasks.student_id is missing" };
  }

  return upsertActivityBySource(supabase, {
    studentId,
    activityType: "assignment",
    track: extractTaskTrack(row),
    section: extractTaskSection(row),
    status: normalizeTaskStatus(row.status),
    sourceTable: "student_tasks",
    sourceId: String(row.id),
    title: asString(row.title),
    description: asString(row.description),
    dueAt: asIsoDateTime(row.due_at) ?? asIsoDateTime(row.due_date),
    createdAt: asIsoDateTime(row.created_at),
    updatedAt: asIsoDateTime(row.updated_at) ?? asIsoDateTime(row.created_at),
    meta: buildTaskActivityMeta(row),
  });
}

export async function syncReadingSessionActivityById(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<SyncResult> {
  const sessionRes = await supabase
    .from("reading_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (sessionRes.error) {
    return { ok: false, error: sessionRes.error.message };
  }

  const row = sessionRes.data as LooseRow;
  const studentId =
    asString(row.user_id) ??
    asString(row.student_id) ??
    asString(row.profile_id);

  if (!studentId) {
    return { ok: false, error: "reading_sessions user identifier is missing" };
  }

  return upsertActivityBySource(supabase, {
    studentId,
    activityType: "reading_session",
    track: extractReadingTrack(row),
    section: "reading",
    status: normalizeReadingStatus(row),
    sourceTable: "reading_sessions",
    sourceId: String(row.id),
    title: "Reading Session",
    description: null,
    score: asNumber(row.score),
    accuracy: asNumber(row.accuracy),
    startedAt: asIsoDateTime(row.started_at) ?? asIsoDateTime(row.created_at),
    completedAt: asIsoDateTime(row.completed_at),
    createdAt: asIsoDateTime(row.created_at),
    updatedAt: asIsoDateTime(row.updated_at) ?? asIsoDateTime(row.created_at),
    meta: buildReadingActivityMeta(row),
  });
}

export async function syncStudentTaskActivitiesBatch(
  supabase: SupabaseClient,
  limit = 200,
): Promise<BatchSyncResult> {
  const res = await supabase
    .from("student_tasks")
    .select("id")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (res.error) {
    return { ok: false, error: res.error.message, synced: 0 };
  }

  const rows = (res.data ?? []) as Array<{ id: string }>;
  return runBatchSync(rows, (row) => syncStudentTaskActivityById(supabase, row.id));
}

export async function syncReadingSessionActivitiesBatch(
  supabase: SupabaseClient,
  limit = 200,
): Promise<BatchSyncResult> {
  const res = await supabase
    .from("reading_sessions")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (res.error) {
    return { ok: false, error: res.error.message, synced: 0 };
  }

  const rows = (res.data ?? []) as Array<{ id: string }>;
  return runBatchSync(rows, (row) => syncReadingSessionActivityById(supabase, row.id));
}

async function runBatchSync<T>(
  rows: T[],
  fn: (row: T) => Promise<SyncResult>,
  concurrency = 10,
): Promise<BatchSyncResult> {
  let synced = 0;
  for (let i = 0; i < rows.length; i += concurrency) {
    const chunk = rows.slice(i, i + concurrency);
    const results = await Promise.all(chunk.map(fn));
    for (const result of results) {
      if ("error" in result) return { ok: false, error: result.error, synced };
      synced += 1;
    }
  }
  return { ok: true, synced };
}
