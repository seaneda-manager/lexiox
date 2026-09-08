export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceSupabase } from "@/lib/supabase/service";
import { getPlannerStudentContext, type PlannerStudentContext } from "@/lib/planner/studentContext";
import {
  generateExamPrep,
  generatePerformancePrep,
  type RoutineSlot,
} from "@/lib/planner/generateExamPrep";
import { isPresetKey } from "@/lib/planner/presets";

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const EXAM_SELECT =
  "id, exam_type, title, subjects, start_date, end_date, prep_start_date, preset_key, source, source_id";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
function addDaysIso(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// ── 자동 소스 → student_exams upsert ────────────────────────────────────
async function syncExams(db: SupabaseClient, ctx: PlannerStudentContext) {
  const today = todayIso();
  const rows: Array<Record<string, unknown>> = [];

  // 1) 학교 시험기간 (school_exam_periods)
  if (ctx.schoolId) {
    try {
      const { data } = await db
        .from("school_exam_periods")
        .select("id, exam_type, year, semester, start_date, end_date, prep_start_date")
        .eq("school_id", ctx.schoolId)
        .gte("end_date", today);
      for (const p of data ?? []) {
        const r = p as Record<string, string>;
        rows.push({
          student_id: ctx.academyId,
          exam_type: r.exam_type === "final" ? "naesin_final" : "naesin_midterm",
          title: `${r.year}년 ${r.semester}학기 ${r.exam_type === "final" ? "기말고사" : "중간고사"}`,
          start_date: r.start_date,
          end_date: r.end_date,
          prep_start_date: r.prep_start_date ?? addDaysIso(r.start_date, -28),
          source: "school_period",
          source_id: r.id,
        });
      }
    } catch (e) {
      console.warn("syncExams school_exam_periods", (e as Error)?.message);
    }
  }

  // 2) 내신 시험일 (naesin_exam_schedule) — 점 시험
  try {
    const { data } = await db
      .from("naesin_exam_schedule")
      .select("id, exam_name, exam_date")
      .eq("student_id", ctx.authId)
      .gte("exam_date", today);
    for (const p of data ?? []) {
      const r = p as Record<string, string>;
      rows.push({
        student_id: ctx.academyId,
        exam_type: "naesin_midterm",
        title: r.exam_name || "내신 시험",
        start_date: r.exam_date,
        end_date: r.exam_date,
        prep_start_date: addDaysIso(r.exam_date, -28),
        source: "naesin_schedule",
        source_id: r.id,
      });
    }
  } catch (e) {
    console.warn("syncExams naesin_exam_schedule", (e as Error)?.message);
  }

  // 3) TOEFL 모의 (test_assignments.exam_date)
  try {
    const { data } = await db
      .from("test_assignments")
      .select("id, exam_date")
      .in("student_id", [ctx.authId, ctx.academyId])
      .gte("exam_date", today);
    for (const p of data ?? []) {
      const r = p as Record<string, string>;
      if (!r.exam_date) continue;
      rows.push({
        student_id: ctx.academyId,
        exam_type: "toefl",
        title: "TOEFL 모의고사",
        start_date: r.exam_date,
        end_date: r.exam_date,
        prep_start_date: addDaysIso(r.exam_date, -14),
        source: "assignment",
        source_id: r.id,
      });
    }
  } catch (e) {
    console.warn("syncExams test_assignments", (e as Error)?.message);
  }

  if (rows.length === 0) return;
  // 이미 있는 (source, source_id) 는 건드리지 않음 — 학생이 수정한 값 보존
  const { data: existing } = await db
    .from("student_exams")
    .select("source, source_id")
    .eq("student_id", ctx.academyId)
    .not("source_id", "is", null);
  const seen = new Set((existing ?? []).map((e) => `${(e as Record<string, string>).source}:${(e as Record<string, string>).source_id}`));
  const fresh = rows.filter((r) => !seen.has(`${r.source}:${r.source_id}`));
  if (fresh.length > 0) {
    await db.from("student_exams").insert(fresh);
  }
}

// GET — 동기 후 전체 목록
export async function GET() {
  try {
    const ctx = await getPlannerStudentContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const db = getServiceSupabase();

    await syncExams(db, ctx).catch((e) => console.warn("syncExams", (e as Error)?.message));

    const { data, error } = await db
      .from("student_exams")
      .select(EXAM_SELECT)
      .eq("student_id", ctx.academyId)
      .gte("end_date", addDaysIso(todayIso(), -1))
      .order("start_date", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ ok: true, exams: data ?? [] });
  } catch (e) {
    console.error("STUDENT PLANNER EXAMS GET", e);
    return NextResponse.json({ error: (e as Error)?.message ?? "error" }, { status: 500 });
  }
}

// POST — 수동 시험 추가  또는  ?action=generate 로 프리셋 생성
export async function POST(req: Request) {
  try {
    const ctx = await getPlannerStudentContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const db = getServiceSupabase();
    const action = new URL(req.url).searchParams.get("action");
    const body = (await req.json()) as Record<string, unknown>;

    // ── 프리셋 생성 ──────────────────────────────────────────────
    if (action === "generate") {
      const examId = body.exam_id;
      const presetKey = body.preset_key;
      if (typeof examId !== "string" || !isPresetKey(presetKey)) {
        return NextResponse.json({ error: "exam_id / preset_key 필요" }, { status: 400 });
      }
      const { data: exam, error: exErr } = await db
        .from("student_exams")
        .select("id, student_id, title, subjects, start_date, end_date, prep_start_date")
        .eq("id", examId)
        .eq("student_id", ctx.academyId)
        .maybeSingle();
      if (exErr) throw exErr;
      if (!exam) return NextResponse.json({ error: "시험을 찾을 수 없어요" }, { status: 404 });

      const { data: slots } = await db
        .from("student_routine_slots")
        .select("zone, weekday, start_time, end_time, kind")
        .eq("student_id", ctx.academyId);

      const generated = generateExamPrep(
        exam as Parameters<typeof generateExamPrep>[0],
        presetKey,
        (slots ?? []) as RoutineSlot[],
      );

      // 기존 미완료 preset 블록 제거 후 재삽입 (완료분 보존)
      await db
        .from("student_day_blocks")
        .delete()
        .eq("student_id", ctx.academyId)
        .eq("exam_id", examId)
        .eq("source", "preset")
        .eq("done", false);

      if (generated.length > 0) {
        const { error: insErr } = await db
          .from("student_day_blocks")
          .insert(generated.map((g) => ({ ...g, created_by: ctx.authId })));
        if (insErr) throw insErr;
      }
      await db
        .from("student_exams")
        .update({ preset_key: presetKey, updated_at: new Date().toISOString() })
        .eq("id", examId)
        .eq("student_id", ctx.academyId);

      return NextResponse.json({ ok: true, generated: generated.length });
    }

    // ── 수동 시험 추가 ──────────────────────────────────────────
    const title = String(body.title ?? "").trim();
    const startDate = String(body.start_date ?? "");
    const endDate = String(body.end_date ?? startDate);
    const examType = String(body.exam_type ?? "other");
    const subjects = Array.isArray(body.subjects)
      ? (body.subjects as unknown[]).map((s) => String(s).trim()).filter(Boolean)
      : [];
    if (!title || !ISO.test(startDate) || !ISO.test(endDate)) {
      return NextResponse.json({ error: "title / start_date / end_date 필요" }, { status: 400 });
    }
    const prepStart =
      typeof body.prep_start_date === "string" && ISO.test(body.prep_start_date)
        ? body.prep_start_date
        : addDaysIso(startDate, -28);

    const safeType = [
      "naesin_midterm",
      "naesin_final",
      "mock",
      "toefl",
      "performance",
      "other",
    ].includes(examType)
      ? examType
      : "other";

    const { data, error } = await db
      .from("student_exams")
      .insert({
        student_id: ctx.academyId,
        exam_type: safeType,
        title,
        subjects,
        start_date: startDate,
        end_date: endDate < startDate ? startDate : endDate,
        prep_start_date: prepStart > startDate ? startDate : prepStart,
        source: "student",
        created_by: ctx.authId,
      })
      .select(EXAM_SELECT)
      .single();
    if (error) throw error;

    // 수행평가는 회독 프리셋이 안 맞으므로 D-3 준비 블록을 바로 깔아준다
    if (safeType === "performance" && data) {
      const d = data as { id: string; title: string; subjects: string[]; start_date: string; end_date: string; prep_start_date: string };
      const generated = generatePerformancePrep({ ...d, student_id: ctx.academyId });
      if (generated.length > 0) {
        await db
          .from("student_day_blocks")
          .insert(generated.map((g) => ({ ...g, created_by: ctx.authId })))
          .then(({ error: e }) => e && console.warn("performance prep insert", e.message));
      }
    }
    return NextResponse.json({ ok: true, exam: data });
  } catch (e) {
    console.error("STUDENT PLANNER EXAMS POST", e);
    return NextResponse.json({ error: (e as Error)?.message ?? "error" }, { status: 500 });
  }
}

// PATCH — 시험 수정 (과목 / 날짜 / prep_start)
export async function PATCH(req: Request) {
  try {
    const ctx = await getPlannerStudentContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const db = getServiceSupabase();
    const body = (await req.json()) as Record<string, unknown>;
    const id = body.id;
    if (typeof id !== "string") return NextResponse.json({ error: "id 필요" }, { status: 400 });

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (Array.isArray(body.subjects)) {
      update.subjects = (body.subjects as unknown[]).map((s) => String(s).trim()).filter(Boolean);
    }
    for (const f of ["title", "exam_type", "start_date", "end_date", "prep_start_date"] as const) {
      if (typeof body[f] === "string" && body[f]) update[f] = body[f];
    }

    const { data, error } = await db
      .from("student_exams")
      .update(update)
      .eq("id", id)
      .eq("student_id", ctx.academyId)
      .select(EXAM_SELECT)
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ ok: true, exam: data });
  } catch (e) {
    console.error("STUDENT PLANNER EXAMS PATCH", e);
    return NextResponse.json({ error: (e as Error)?.message ?? "error" }, { status: 500 });
  }
}

// DELETE /api/student/planner/exams?id=  (수동 등록분만)
export async function DELETE(req: Request) {
  try {
    const ctx = await getPlannerStudentContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const db = getServiceSupabase();
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });

    const { error } = await db
      .from("student_exams")
      .delete()
      .eq("id", id)
      .eq("student_id", ctx.academyId)
      .eq("source", "student");
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("STUDENT PLANNER EXAMS DELETE", e);
    return NextResponse.json({ error: (e as Error)?.message ?? "error" }, { status: 500 });
  }
}
