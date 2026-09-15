export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

async function requireStaff() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin" && profile?.role !== "teacher") return null;
  return user;
}

async function resolveAcademyStudentId(
  db: ReturnType<typeof getServiceSupabase>,
  studentId: string,
): Promise<string | null> {
  for (const col of ["id", "auth_user_id", "user_id", "profile_id"] as const) {
    const { data } = await db
      .from("academy_students")
      .select("id")
      .eq(col as string, studentId)
      .maybeSingle();
    if (data?.id) return String(data.id);
  }
  return null;
}

// GET /api/teacher/students/[studentId]/planner?from=YYYY-MM-DD&to=YYYY-MM-DD
// Read-only: a teacher/admin viewing a student's own plan calendar (day blocks,
// exams, lesson logs). No mutation endpoints here on purpose — the plan stays
// student-authored, this is just visibility.
export async function GET(req: Request, { params }: { params: Promise<{ studentId: string }> }) {
  try {
    const staffUser = await requireStaff();
    if (!staffUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { studentId } = await params;
    const db = getServiceSupabase();
    const academyId = await resolveAcademyStudentId(db, studentId);
    if (!academyId) return NextResponse.json({ error: "학생을 찾을 수 없습니다" }, { status: 404 });

    const sp = new URL(req.url).searchParams;
    const from = sp.get("from");
    const to = sp.get("to");
    if (!from || !to || !ISO.test(from) || !ISO.test(to)) {
      return NextResponse.json({ error: "from/to (YYYY-MM-DD) 필요" }, { status: 400 });
    }

    const [blocksRes, examsRes, lessonsRes] = await Promise.all([
      db
        .from("student_day_blocks")
        .select(
          "id, block_date, zone, start_time, end_time, kind, subject, exam_id, title, note, source, done, done_at, concept_done, practice_done, assessment_done, weakness_note",
        )
        .eq("student_id", academyId)
        .gte("block_date", from)
        .lte("block_date", to)
        .order("block_date", { ascending: true }),
      db
        .from("student_exams")
        .select(
          "id, exam_type, title, subjects, start_date, end_date, prep_start_date, preset_key, source",
        )
        .eq("student_id", academyId)
        .gte("end_date", from.slice(0, 4) + "-01-01")
        .order("start_date", { ascending: true }),
      db
        .from("student_lesson_logs")
        .select(
          "id, lesson_date, start_time, end_time, title, status, plan_note, log_note, homework_note",
        )
        .eq("student_id", academyId)
        .gte("lesson_date", from)
        .lte("lesson_date", to)
        .order("lesson_date", { ascending: true }),
    ]);

    return NextResponse.json(
      {
        ok: true,
        blocks: blocksRes.data ?? [],
        exams: examsRes.data ?? [],
        lessons: lessonsRes.data ?? [],
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("TEACHER STUDENT PLANNER GET", e);
    return NextResponse.json({ error: (e as Error)?.message ?? "error" }, { status: 500 });
  }
}
