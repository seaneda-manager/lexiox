export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import {
  generateExamPrep,
  generatePerformancePrep,
  type ExamInput,
  type RoutineSlot,
} from "@/lib/planner/generateExamPrep";
import { isPresetKey } from "@/lib/planner/presets";

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const EXAM_TYPES = [
  "naesin_midterm",
  "naesin_final",
  "mock",
  "toefl",
  "performance",
  "other",
] as const;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
function addDaysIso(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

async function requireStaff() {
  const authed = await getServerSupabase();
  const {
    data: { user },
  } = await authed.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { data: profile } = await authed
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || !["admin", "teacher"].includes(profile.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user };
}

// 배치 하나에 대한 준비 블록을 (재)생성한다 — 학생별.
async function regenPrepForBatch(
  db: ReturnType<typeof getServiceSupabase>,
  rows: Array<Record<string, unknown>>,
  presetKey: string | null,
) {
  for (const row of rows) {
    const exam: ExamInput = {
      id: String(row.id),
      student_id: String(row.student_id),
      title: String(row.title),
      subjects: Array.isArray(row.subjects) ? (row.subjects as string[]) : [],
      start_date: String(row.start_date),
      end_date: String(row.end_date),
      prep_start_date: String(row.prep_start_date),
    };

    // 이 시험에 연결된 미완료 preset 블록 제거 후 재삽입 (완료분 보존)
    await db
      .from("student_day_blocks")
      .delete()
      .eq("student_id", exam.student_id)
      .eq("exam_id", exam.id)
      .eq("source", "preset")
      .eq("done", false);

    let generated;
    if (row.exam_type === "performance") {
      generated = generatePerformancePrep(exam);
    } else if (presetKey && isPresetKey(presetKey)) {
      const { data: slots } = await db
        .from("student_routine_slots")
        .select("zone, weekday, start_time, end_time, kind")
        .eq("student_id", exam.student_id);
      generated = generateExamPrep(exam, presetKey, (slots ?? []) as RoutineSlot[]);
    } else {
      generated = [];
    }

    if (generated.length > 0) {
      await db
        .from("student_day_blocks")
        .insert(generated.map((g) => ({ ...g, created_by: row.assigned_by ?? null })));
    }
  }
}

// GET — 선생님이 배정한 시험/수행평가 목록 (배치 단위로 그룹)
export async function GET() {
  const gate = await requireStaff();
  if ("error" in gate) return gate.error;
  const db = getServiceSupabase();

  const { data, error } = await db
    .from("student_exams")
    .select(
      "id, student_id, source_id, exam_type, title, subjects, start_date, end_date, prep_start_date, preset_key, assigned_by, created_at",
    )
    .eq("source", "teacher")
    .gte("end_date", addDaysIso(todayIso(), -30))
    .order("start_date", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rosterIds = [...new Set((data ?? []).map((r) => String(r.student_id)))];
  const nameById = new Map<string, string>();
  if (rosterIds.length > 0) {
    const { data: roster } = await db
      .from("academy_students")
      .select("id, display_name")
      .in("id", rosterIds);
    for (const s of roster ?? []) {
      nameById.set(String((s as { id: string }).id), (s as { display_name: string | null }).display_name ?? "(이름 없음)");
    }
  }

  const batches = new Map<string, Record<string, unknown>>();
  for (const r of data ?? []) {
    const key = String(r.source_id ?? r.id);
    const existing = batches.get(key);
    const studentEntry = { academyId: String(r.student_id), name: nameById.get(String(r.student_id)) ?? "?" };
    if (existing) {
      (existing.students as Array<unknown>).push(studentEntry);
    } else {
      batches.set(key, {
        batchId: key,
        exam_type: r.exam_type,
        title: r.title,
        subjects: r.subjects ?? [],
        start_date: r.start_date,
        end_date: r.end_date,
        prep_start_date: r.prep_start_date,
        preset_key: r.preset_key,
        created_at: r.created_at,
        students: [studentEntry],
      });
    }
  }

  return NextResponse.json({ ok: true, batches: [...batches.values()] });
}

// POST — 여러 학생에게 시험/수행평가 일괄 배정
export async function POST(req: Request) {
  const gate = await requireStaff();
  if ("error" in gate) return gate.error;
  const db = getServiceSupabase();
  const body = (await req.json()) as Record<string, unknown>;

  const studentIds = Array.isArray(body.student_ids)
    ? [...new Set((body.student_ids as unknown[]).map((s) => String(s)).filter(Boolean))]
    : [];
  const title = String(body.title ?? "").trim();
  const examTypeRaw = String(body.exam_type ?? "other");
  const examType = (EXAM_TYPES as readonly string[]).includes(examTypeRaw) ? examTypeRaw : "other";
  const startDate = String(body.start_date ?? "");
  const endDate = String(body.end_date ?? startDate);
  const subjects = Array.isArray(body.subjects)
    ? (body.subjects as unknown[]).map((s) => String(s).trim()).filter(Boolean)
    : [];
  const presetKey = isPresetKey(body.preset_key) ? body.preset_key : null;
  const autoPrep = body.auto_prep !== false; // 기본 true

  if (studentIds.length === 0) {
    return NextResponse.json({ error: "대상 학생을 선택하세요" }, { status: 400 });
  }
  if (!title || !ISO.test(startDate) || !ISO.test(endDate)) {
    return NextResponse.json({ error: "제목 / 시작일 / 종료일 필요" }, { status: 400 });
  }
  const start = endDate < startDate ? endDate : startDate;
  const end = endDate < startDate ? startDate : endDate;
  const prepStart =
    typeof body.prep_start_date === "string" && ISO.test(body.prep_start_date) && body.prep_start_date <= start
      ? body.prep_start_date
      : addDaysIso(start, examType === "performance" ? -3 : -28);

  const batchId = crypto.randomUUID();
  const insertRows = studentIds.map((sid) => ({
    student_id: sid,
    exam_type: examType,
    title,
    subjects,
    start_date: start,
    end_date: end,
    prep_start_date: prepStart,
    preset_key: examType === "performance" ? null : presetKey,
    source: "teacher",
    source_id: batchId,
    assigned_by: gate.user.id,
    created_by: gate.user.id,
  }));

  const { data: inserted, error } = await db
    .from("student_exams")
    .insert(insertRows)
    .select("id, student_id, exam_type, title, subjects, start_date, end_date, prep_start_date, assigned_by");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (autoPrep && (examType === "performance" || presetKey)) {
    await regenPrepForBatch(db, (inserted ?? []) as Array<Record<string, unknown>>, presetKey).catch((e) =>
      console.warn("regenPrepForBatch", (e as Error)?.message),
    );
  }

  return NextResponse.json({ ok: true, batchId, count: insertRows.length });
}

// PATCH — 배치 전체 수정 (제목/과목/날짜/프리셋). body: { batch_id, ...fields, regen?: bool }
export async function PATCH(req: Request) {
  const gate = await requireStaff();
  if ("error" in gate) return gate.error;
  const db = getServiceSupabase();
  const body = (await req.json()) as Record<string, unknown>;
  const batchId = body.batch_id;
  if (typeof batchId !== "string") {
    return NextResponse.json({ error: "batch_id 필요" }, { status: 400 });
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.title === "string" && body.title.trim()) update.title = body.title.trim();
  if (Array.isArray(body.subjects)) {
    update.subjects = (body.subjects as unknown[]).map((s) => String(s).trim()).filter(Boolean);
  }
  for (const f of ["start_date", "end_date", "prep_start_date"] as const) {
    if (typeof body[f] === "string" && ISO.test(body[f] as string)) update[f] = body[f];
  }
  if (isPresetKey(body.preset_key)) update.preset_key = body.preset_key;

  const { data: rows, error } = await db
    .from("student_exams")
    .update(update)
    .eq("source", "teacher")
    .eq("source_id", batchId)
    .select("id, student_id, exam_type, title, subjects, start_date, end_date, prep_start_date, preset_key, assigned_by");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!rows || rows.length === 0) return NextResponse.json({ error: "배정을 찾을 수 없어요" }, { status: 404 });

  if (body.regen !== false) {
    const presetKey = (rows[0] as { preset_key: string | null }).preset_key;
    await regenPrepForBatch(db, rows as Array<Record<string, unknown>>, presetKey).catch((e) =>
      console.warn("regenPrepForBatch", (e as Error)?.message),
    );
  }

  return NextResponse.json({ ok: true, count: rows.length });
}

// DELETE /api/teacher/exam-schedule?batch=<source_id>
export async function DELETE(req: Request) {
  const gate = await requireStaff();
  if ("error" in gate) return gate.error;
  const db = getServiceSupabase();
  const batchId = new URL(req.url).searchParams.get("batch");
  if (!batchId) return NextResponse.json({ error: "batch 필요" }, { status: 400 });

  // 연결된 preset 블록 먼저 정리
  const { data: rows } = await db
    .from("student_exams")
    .select("id")
    .eq("source", "teacher")
    .eq("source_id", batchId);
  const examIds = (rows ?? []).map((r) => String((r as { id: string }).id));
  if (examIds.length > 0) {
    await db.from("student_day_blocks").delete().in("exam_id", examIds).eq("source", "preset");
  }

  const { error } = await db
    .from("student_exams")
    .delete()
    .eq("source", "teacher")
    .eq("source_id", batchId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
