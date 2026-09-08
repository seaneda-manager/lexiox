export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const SELECT =
  "id, student_id, lesson_date, start_time, end_time, title, status, plan_note, log_note, homework_note, teacher_id";

const FIELDS = [
  "lesson_date",
  "start_time",
  "end_time",
  "title",
  "status",
  "plan_note",
  "log_note",
  "homework_note",
] as const;

function pick(body: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const f of FIELDS) {
    if (f in body) out[f] = body[f] === "" ? null : body[f];
  }
  return out;
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

// GET /api/teacher/lesson-logs?student=<academyId>&from=&to=
export async function GET(req: Request) {
  const gate = await requireStaff();
  if ("error" in gate) return gate.error;

  const sp = new URL(req.url).searchParams;
  const student = sp.get("student");
  const from = sp.get("from");
  const to = sp.get("to");
  if (!student) return NextResponse.json({ error: "student 필요" }, { status: 400 });

  const db = getServiceSupabase();
  let q = db.from("student_lesson_logs").select(SELECT).eq("student_id", student);
  if (from && ISO.test(from)) q = q.gte("lesson_date", from);
  if (to && ISO.test(to)) q = q.lte("lesson_date", to);
  const { data, error } = await q.order("lesson_date", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, lessons: data ?? [] });
}

// POST — 수업 생성
export async function POST(req: Request) {
  const gate = await requireStaff();
  if ("error" in gate) return gate.error;

  const body = (await req.json()) as Record<string, unknown>;
  const student = body.student_id;
  const fields = pick(body);
  if (typeof student !== "string") {
    return NextResponse.json({ error: "student_id 필요" }, { status: 400 });
  }
  if (!fields.lesson_date || !ISO.test(String(fields.lesson_date))) {
    return NextResponse.json({ error: "lesson_date 필요" }, { status: 400 });
  }

  const db = getServiceSupabase();
  const { data, error } = await db
    .from("student_lesson_logs")
    .insert({
      ...fields,
      student_id: student,
      title: fields.title || "학원 수업",
      teacher_id: gate.user.id,
    })
    .select(SELECT)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, lesson: data });
}

// PATCH — 수업 수정 / 수업 후 로그 입력
export async function PATCH(req: Request) {
  const gate = await requireStaff();
  if ("error" in gate) return gate.error;

  const body = (await req.json()) as Record<string, unknown>;
  const id = body.id;
  if (typeof id !== "string") return NextResponse.json({ error: "id 필요" }, { status: 400 });

  const db = getServiceSupabase();
  const { data, error } = await db
    .from("student_lesson_logs")
    .update({ ...pick(body), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(SELECT)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true, lesson: data });
}

// DELETE /api/teacher/lesson-logs?id=
export async function DELETE(req: Request) {
  const gate = await requireStaff();
  if ("error" in gate) return gate.error;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });

  const db = getServiceSupabase();
  const { error } = await db.from("student_lesson_logs").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
