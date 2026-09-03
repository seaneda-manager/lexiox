import "server-only";
import { getServiceSupabase } from "@/lib/supabase/service";
import {
  toIsoDate,
  type AssignmentItem,
  type AssignmentDateBasis,
  type AssignmentStatus,
} from "@/lib/assignments/types";

export {
  toIsoDate,
  ASSIGNMENT_KIND_LABEL,
  ASSIGNMENT_STATUS_LABEL,
} from "@/lib/assignments/types";
export type {
  AssignmentItem,
  AssignmentKind,
  AssignmentStatus,
  AssignmentDateBasis,
} from "@/lib/assignments/types";

/** timestamptz/date 문자열 → YYYY-MM-DD (앞 10자). 못 읽으면 null */
function datePart(v: unknown): string | null {
  if (typeof v !== "string" || v.length < 10) return null;
  const s = v.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function firstDate(
  candidates: Array<[unknown, AssignmentDateBasis]>,
): { date: string; basis: AssignmentDateBasis } | null {
  for (const [v, basis] of candidates) {
    const d = datePart(v);
    if (d) return { date: d, basis };
  }
  return null;
}

const inRange = (d: string, from: string, to: string) => d >= from && d <= to;

// ── 학생 id 해석 ────────────────────────────────────────────

export async function resolveStudentIds(
  authOrAcademyId: string,
): Promise<{ authId: string | null; academyId: string | null }> {
  const db = getServiceSupabase();
  // 넘어온 값이 auth uid 라고 가정하고 academy 행 찾기
  for (const col of ["user_id", "auth_user_id", "profile_id", "id"] as const) {
    const { data } = await db
      .from("academy_students")
      .select("id, user_id, auth_user_id")
      .eq(col, authOrAcademyId)
      .maybeSingle();
    if (data) {
      const authId = (data as any).user_id ?? (data as any).auth_user_id ?? (col === "id" ? null : authOrAcademyId);
      return { authId: authId ?? null, academyId: String(data.id) };
    }
  }
  // academy 행이 없으면 넘어온 값을 auth id로만 취급
  return { authId: authOrAcademyId, academyId: null };
}

// ── 소스별 수집 ────────────────────────────────────────────

type Ctx = { fromIso: string; toIso: string; authId: string | null; academyId: string | null };

async function collectHomework(db: any, { fromIso, toIso, authId }: Ctx): Promise<AssignmentItem[]> {
  if (!authId) return [];
  const { data: hw } = await db
    .from("photo_homework")
    .select("id, title, subject, due_at, created_at, is_active, student_id")
    .or(`student_id.is.null,student_id.eq.${authId}`)
    .eq("is_active", true);
  if (!hw?.length) return [];

  const ids = hw.map((h: any) => h.id);
  const { data: subs } = await db
    .from("photo_homework_submissions")
    .select("homework_id, correct_count, total_count, graded_at")
    .eq("student_id", authId)
    .in("homework_id", ids);
  const subByHw = new Map((subs ?? []).map((s: any) => [s.homework_id, s]));
  const today = toIsoDate(new Date());
  const out: AssignmentItem[] = [];

  for (const h of hw) {
    const picked = firstDate([
      [h.due_at, "due"],
      [h.created_at, "assigned"],
    ]);
    if (!picked || !inRange(picked.date, fromIso, toIso)) continue;
    const sub: any = subByHw.get(h.id);
    let status: AssignmentStatus = "pending";
    let scorePct: number | null | undefined;
    if (sub) {
      status = "graded";
      scorePct = sub.total_count > 0 ? Math.round((sub.correct_count / sub.total_count) * 100) : null;
    } else if (picked.basis === "due" && picked.date < today) {
      status = "overdue";
    }
    out.push({
      id: h.id,
      kind: "homework",
      title: h.title ?? "숙제",
      subject: h.subject ?? undefined,
      date: picked.date,
      dateBasis: picked.basis,
      status,
      scorePct,
      href: `/admin/homework/${h.id}`,
    });
  }
  return out;
}

async function collectDailyTests(db: any, { fromIso, toIso, authId }: Ctx): Promise<AssignmentItem[]> {
  if (!authId) return [];
  const { data } = await db
    .from("daily_tests")
    .select("id, task_type, difficulty, status, due_date, assigned_date, created_at, completed_at, total_score")
    .eq("student_id", authId)
    .is("deleted_at", null);
  if (!data?.length) return [];
  const out: AssignmentItem[] = [];
  for (const t of data) {
    const picked = firstDate([
      [t.due_date, "due"],
      [t.assigned_date, "assigned"],
      [t.created_at, "assigned"],
    ]);
    if (!picked || !inRange(picked.date, fromIso, toIso)) continue;
    let status: AssignmentStatus =
      t.status === "completed" || t.completed_at ? "completed" : t.status === "in_progress" || t.started_at ? "in_progress" : "pending";
    out.push({
      id: t.id,
      kind: "daily_test",
      title: `Daily Test · ${t.task_type ?? ""}${t.difficulty ? ` (${t.difficulty})` : ""}`.trim(),
      date: picked.date,
      dateBasis: picked.basis,
      status,
      scorePct: typeof t.total_score === "number" ? t.total_score : undefined,
      href: t.completed_at ? `/admin/daily-tests/${t.id}` : "/admin/daily-tests",
    });
  }
  return out;
}

const SECTION_KO: Record<string, string> = { reading: "Reading", listening: "Listening", speaking: "Speaking", writing: "Writing" };

async function collectToeflAssignments(db: any, { fromIso, toIso, authId, academyId }: Ctx): Promise<AssignmentItem[]> {
  const ids = [authId, academyId].filter(Boolean) as string[];
  if (ids.length === 0) return [];
  const out: AssignmentItem[] = [];

  // 개별 영역 (group_id null)
  const { data: solo } = await db
    .from("test_assignments")
    .select("id, sections, status, score, due_date, due_at, assigned_at")
    .in("student_id", ids)
    .is("group_id", null);
  for (const a of solo ?? []) {
    const picked = firstDate([
      [a.due_date, "due"],
      [a.due_at, "due"],
      [a.assigned_at, "assigned"],
    ]);
    if (!picked || !inRange(picked.date, fromIso, toIso)) continue;
    const section = Array.isArray(a.sections) ? a.sections[0] : undefined;
    out.push({
      id: a.id,
      kind: "toefl_section",
      title: SECTION_KO[section] ?? section ?? "영역 배정",
      date: picked.date,
      dateBasis: picked.basis,
      status: normalizeStatus(a.status),
      scorePct: typeof a.score === "number" ? a.score : undefined,
    });
  }

  // 그룹 (Full/Half)
  const { data: groups } = await db
    .from("test_assignment_groups")
    .select("id, kind, status, due_date, created_at")
    .in("student_id", ids);
  const gIds = (groups ?? []).map((g: any) => g.id);
  const { data: members } = gIds.length
    ? await db.from("test_assignments").select("group_id, sections").in("group_id", gIds)
    : { data: [] };
  const cntByGroup = new Map<string, number>();
  for (const m of members ?? []) cntByGroup.set(m.group_id, (cntByGroup.get(m.group_id) ?? 0) + 1);
  for (const g of groups ?? []) {
    const picked = firstDate([
      [g.due_date, "due"],
      [g.created_at, "assigned"],
    ]);
    if (!picked || !inRange(picked.date, fromIso, toIso)) continue;
    out.push({
      id: g.id,
      kind: "toefl_group",
      title: `${g.kind === "full" ? "Full Test" : "Half Test"} · ${cntByGroup.get(g.id) ?? 0}개 영역`,
      date: picked.date,
      dateBasis: picked.basis,
      status: normalizeStatus(g.status),
    });
  }
  return out;
}

function normalizeStatus(s: unknown): AssignmentStatus {
  const v = String(s ?? "").toLowerCase();
  if (["completed", "done", "graded"].includes(v)) return "completed";
  if (["submitted"].includes(v)) return "submitted";
  if (["in_progress", "started"].includes(v)) return "in_progress";
  if (["overdue", "expired"].includes(v)) return "overdue";
  return "pending";
}

async function collectVocab(db: any, { fromIso, toIso, academyId }: Ctx): Promise<AssignmentItem[]> {
  if (!academyId) return [];
  const { data } = await db
    .from("student_vocab_assignments")
    .select("id, day_index, available_at, assigned_at, completed_at, canceled_at, status")
    .eq("student_id", academyId);
  if (!data?.length) return [];
  const out: AssignmentItem[] = [];
  for (const v of data) {
    if (v.canceled_at) continue;
    const picked = v.completed_at
      ? { date: datePart(v.completed_at)!, basis: "completed" as AssignmentDateBasis }
      : firstDate([
          [v.available_at, "available"],
          [v.assigned_at, "assigned"],
        ]);
    if (!picked || !datePart(picked.date) || !inRange(picked.date, fromIso, toIso)) continue;
    out.push({
      id: v.id,
      kind: "vocab",
      title: `단어 Day ${v.day_index ?? "?"}`,
      subject: "vocab",
      date: picked.date,
      dateBasis: picked.basis,
      status: v.completed_at ? "completed" : "pending",
    });
  }
  return out;
}

async function collectJr(db: any, { fromIso, toIso, academyId }: Ctx): Promise<AssignmentItem[]> {
  if (!academyId) return [];
  const out: AssignmentItem[] = [];
  const tables: Array<[string, string]> = [
    ["jr_reading_sessions", "Jr. Reading"],
    ["jr_grammar_sessions", "Jr. Grammar"],
    ["jr_listening_sessions", "Jr. Listening"],
  ];
  for (const [table, label] of tables) {
    const { data } = await db
      .from(table)
      .select("id, created_at, completed_at, stage")
      .eq("student_id", academyId);
    for (const s of data ?? []) {
      const picked = s.completed_at
        ? { date: datePart(s.completed_at)!, basis: "completed" as AssignmentDateBasis }
        : firstDate([[s.created_at, "assigned"]]);
      if (!picked || !datePart(picked.date) || !inRange(picked.date, fromIso, toIso)) continue;
      out.push({
        id: s.id,
        kind: "jr",
        title: label,
        date: picked.date,
        dateBasis: picked.basis,
        status: s.completed_at ? "completed" : "in_progress",
      });
    }
  }

  const { data: sw } = await db
    .from("jr_speaking_writing_tasks")
    .select("id, title, task_type, due_date, created_at, status")
    .eq("assigned_to_student_id", academyId);
  for (const t of sw ?? []) {
    const picked = firstDate([
      [t.due_date, "due"],
      [t.created_at, "assigned"],
    ]);
    if (!picked || !inRange(picked.date, fromIso, toIso)) continue;
    out.push({
      id: t.id,
      kind: "jr",
      title: t.title ?? `Jr. ${t.task_type === "speaking" ? "Speaking" : "Writing"}`,
      date: picked.date,
      dateBasis: picked.basis,
      status: normalizeStatus(t.status),
    });
  }
  return out;
}

async function collectHiNaesin(db: any, { fromIso, toIso, authId }: Ctx): Promise<AssignmentItem[]> {
  if (!authId) return [];
  const { data: assigns } = await db
    .from("hi_naesin_assignments")
    .select("id, passage_id, due_at, assigned_at, status")
    .eq("student_id", authId);
  if (!assigns?.length) return [];

  const { data: sessions } = await db
    .from("hi_naesin_sessions")
    .select("assignment_id, status, submitted_at, score_percent")
    .eq("student_id", authId)
    .eq("session_type", "drill");
  const sessByAssign = new Map<string, any>();
  for (const s of sessions ?? []) {
    if (s.assignment_id && (s.status === "submitted" || !sessByAssign.has(s.assignment_id))) {
      sessByAssign.set(s.assignment_id, s);
    }
  }

  const out: AssignmentItem[] = [];
  for (const a of assigns) {
    const sess = sessByAssign.get(a.id);
    let picked: { date: string; basis: AssignmentDateBasis } | null;
    let status: AssignmentStatus = "pending";
    let scorePct: number | null | undefined;
    if (sess?.status === "submitted" && datePart(sess.submitted_at)) {
      picked = { date: datePart(sess.submitted_at)!, basis: "completed" };
      status = "completed";
      scorePct = typeof sess.score_percent === "number" ? sess.score_percent : undefined;
    } else {
      picked = firstDate([
        [a.due_at, "due"],
        [a.assigned_at, "assigned"],
      ]);
    }
    if (!picked || !inRange(picked.date, fromIso, toIso)) continue;
    out.push({
      id: a.id,
      kind: "hi_naesin",
      title: "Hi-내신 드릴",
      date: picked.date,
      dateBasis: picked.basis,
      status,
      scorePct,
    });
  }
  return out;
}

// ── 엔트리 ──────────────────────────────────────────────────

export async function getStudentAssignmentCalendar(opts: {
  authUserId: string | null;
  academyStudentId: string | null;
  fromIso: string;
  toIso: string;
}): Promise<AssignmentItem[]> {
  const db = getServiceSupabase();
  const ctx: Ctx = {
    fromIso: opts.fromIso,
    toIso: opts.toIso,
    authId: opts.authUserId,
    academyId: opts.academyStudentId,
  };

  const collectors = [
    collectHomework,
    collectDailyTests,
    collectToeflAssignments,
    collectVocab,
    collectJr,
    collectHiNaesin,
  ];

  const results = await Promise.all(
    collectors.map((fn) =>
      fn(db, ctx).catch((e) => {
        console.error(`[studentAssignmentCalendar] ${fn.name} 실패:`, e?.message ?? e);
        return [] as AssignmentItem[];
      }),
    ),
  );

  const seen = new Set<string>();
  const items: AssignmentItem[] = [];
  for (const arr of results) {
    for (const it of arr) {
      const key = `${it.kind}:${it.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(it);
    }
  }
  items.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.kind.localeCompare(b.kind)));
  return items;
}
