export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

/** GET /api/vocab/exams — 내게 배정된 선생님 출제 단어 시험 목록 + 응시 상태 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (list) => list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
        },
      }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: targets } = await admin
      .from("vocab_teacher_exam_targets")
      .select("exam_id")
      .eq("student_id", user.id);
    const ids = (targets ?? []).map((t: any) => t.exam_id as string);
    if (ids.length === 0) return NextResponse.json({ exams: [] });

    const [{ data: exams }, { data: sessions }] = await Promise.all([
      admin
        .from("vocab_teacher_exams")
        .select("id, title, day_from, day_to, question_count, question_types, created_at")
        .in("id", ids)
        .order("created_at", { ascending: false }),
      admin
        .from("vocab_test_sessions")
        .select("exam_id, status, score, correct_count, total_count")
        .eq("student_id", user.id)
        .in("exam_id", ids),
    ]);

    const byExam = new Map<string, any>();
    for (const s of sessions ?? []) {
      const prev = byExam.get((s as any).exam_id);
      if (!prev || (s as any).status === "graded") byExam.set((s as any).exam_id, s);
    }

    return NextResponse.json({
      exams: (exams ?? []).map((e: any) => ({
        ...e,
        status: byExam.get(e.id)?.status ?? "not_started",
        score: byExam.get(e.id)?.score ?? null,
        correct_count: byExam.get(e.id)?.correct_count ?? null,
        total_count: byExam.get(e.id)?.total_count ?? null,
      })),
    });
  } catch (e) {
    console.error("student exams error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
