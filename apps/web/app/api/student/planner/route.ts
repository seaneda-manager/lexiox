export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { getPlannerStudentContext } from "@/lib/planner/studentContext";
import { getStudentAssignmentCalendar } from "@/lib/assignments/studentAssignmentCalendar";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

const BLOCK_FIELDS = [
  "block_date",
  "zone",
  "start_time",
  "end_time",
  "kind",
  "subject",
  "exam_id",
  "title",
  "note",
] as const;

function pickBlockFields(body: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const f of BLOCK_FIELDS) {
    if (f in body) out[f] = body[f] === "" ? null : body[f];
  }
  return out;
}

// GET /api/student/planner?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(req: Request) {
  try {
    const ctx = await getPlannerStudentContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sp = new URL(req.url).searchParams;
    const from = sp.get("from");
    const to = sp.get("to");
    if (!from || !to || !ISO.test(from) || !ISO.test(to)) {
      return NextResponse.json({ error: "from/to (YYYY-MM-DD) 필요" }, { status: 400 });
    }

    const db = getServiceSupabase();

    const [blocksRes, routineRes, examsRes, lessonsRes, assignmentsRaw] = await Promise.all([
      db
        .from("student_day_blocks")
        .select(
          "id, block_date, zone, start_time, end_time, kind, subject, exam_id, title, note, source, done, done_at",
        )
        .eq("student_id", ctx.academyId)
        .gte("block_date", from)
        .lte("block_date", to)
        .order("block_date", { ascending: true }),
      db
        .from("student_routine_slots")
        .select("id, zone, weekday, start_time, end_time, kind, label")
        .eq("student_id", ctx.academyId),
      db
        .from("student_exams")
        .select(
          "id, exam_type, title, subjects, start_date, end_date, prep_start_date, preset_key, source",
        )
        .eq("student_id", ctx.academyId)
        .gte("end_date", from.slice(0, 4) + "-01-01") // 넉넉하게 (D-day 계산에 과거 시험은 무의미)
        .order("start_date", { ascending: true }),
      db
        .from("student_lesson_logs")
        .select(
          "id, lesson_date, start_time, end_time, title, status, plan_note, log_note, homework_note",
        )
        .eq("student_id", ctx.academyId)
        .gte("lesson_date", from)
        .lte("lesson_date", to)
        .order("lesson_date", { ascending: true }),
      getStudentAssignmentCalendar({
        authUserId: ctx.authId,
        academyStudentId: ctx.academyId,
        fromIso: from,
        toIso: to,
      }).catch(() => []),
    ]);

    // 배정 오버레이 — href 제외 (학생은 /admin 링크 접근 불가)
    const assignments = (assignmentsRaw ?? []).map((it) => ({
      id: it.id,
      kind: it.kind,
      title: it.title,
      subject: it.subject,
      date: it.date,
      dateBasis: it.dateBasis,
      status: it.status,
      scorePct: it.scorePct,
    }));

    return NextResponse.json(
      {
        ok: true,
        blocks: blocksRes.data ?? [],
        routineSlots: routineRes.data ?? [],
        exams: examsRes.data ?? [],
        lessons: lessonsRes.data ?? [],
        assignments,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("STUDENT PLANNER GET", e);
    return NextResponse.json({ error: (e as Error)?.message ?? "error" }, { status: 500 });
  }
}

// POST — day block 생성
export async function POST(req: Request) {
  try {
    const ctx = await getPlannerStudentContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as Record<string, unknown>;
    const fields = pickBlockFields(body);
    if (!fields.block_date || !ISO.test(String(fields.block_date))) {
      return NextResponse.json({ error: "block_date 필요" }, { status: 400 });
    }
    if (!fields.title || String(fields.title).trim() === "") {
      return NextResponse.json({ error: "title 필요" }, { status: 400 });
    }
    if (!fields.zone) fields.zone = "home";
    if (!fields.kind) fields.kind = "study";
    if (fields.zone === "academy") {
      return NextResponse.json({ error: "학원 구역은 선생님만 편집할 수 있어요" }, { status: 403 });
    }

    const db = getServiceSupabase();
    const { data, error } = await db
      .from("student_day_blocks")
      .insert({ ...fields, student_id: ctx.academyId, source: "student", created_by: ctx.authId })
      .select(
        "id, block_date, zone, start_time, end_time, kind, subject, exam_id, title, note, source, done, done_at",
      )
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, block: data });
  } catch (e) {
    console.error("STUDENT PLANNER POST", e);
    return NextResponse.json({ error: (e as Error)?.message ?? "error" }, { status: 500 });
  }
}

// PATCH — day block 수정 / 완료토글
export async function PATCH(req: Request) {
  try {
    const ctx = await getPlannerStudentContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as Record<string, unknown>;
    const id = body.id;
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "id 필요" }, { status: 400 });
    }

    const update: Record<string, unknown> = pickBlockFields(body);
    if ("done" in body) {
      update.done = !!body.done;
      update.done_at = body.done ? new Date().toISOString() : null;
    }
    update.updated_at = new Date().toISOString();

    const db = getServiceSupabase();
    const { data, error } = await db
      .from("student_day_blocks")
      .update(update)
      .eq("id", id)
      .eq("student_id", ctx.academyId) // 소유권 강제
      .select(
        "id, block_date, zone, start_time, end_time, kind, subject, exam_id, title, note, source, done, done_at",
      )
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ ok: true, block: data });
  } catch (e) {
    console.error("STUDENT PLANNER PATCH", e);
    return NextResponse.json({ error: (e as Error)?.message ?? "error" }, { status: 500 });
  }
}

// DELETE /api/student/planner?id=
export async function DELETE(req: Request) {
  try {
    const ctx = await getPlannerStudentContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });

    const db = getServiceSupabase();
    const { error } = await db
      .from("student_day_blocks")
      .delete()
      .eq("id", id)
      .eq("student_id", ctx.academyId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("STUDENT PLANNER DELETE", e);
    return NextResponse.json({ error: (e as Error)?.message ?? "error" }, { status: 500 });
  }
}
