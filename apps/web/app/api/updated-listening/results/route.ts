// apps/web/app/api/updated-listening/results/route.ts
//
// 로그인한 학생의 Listening 응시 기록. Review 모드의 진입점.
// Reading의 /api/updated-reading/results 와 같은 형태로 맞춘다.
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await getServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    const { data: results, error } = await supabase
      .from("listening_results_2026")
      .select("id, test_id, module, difficulty, correct_count, total_questions, finished_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    // 시험 제목은 결과 테이블에 없으므로 따로 조회해 붙인다.
    const testIds = Array.from(new Set((results ?? []).map((r) => r.test_id).filter(Boolean)));
    const labelById = new Map<string, string>();

    if (testIds.length) {
      const { data: tests, error: testError } = await supabase
        .from("listening_tests_2026")
        .select("id, label")
        .in("id", testIds);
      if (testError) throw testError;
      for (const t of tests ?? []) labelById.set(t.id, t.label);
    }

    return NextResponse.json({
      ok: true,
      results: (results ?? []).map((r) => ({
        id: r.id,
        testId: r.test_id,
        testLabel: labelById.get(r.test_id) ?? "삭제된 시험",
        module: r.module,
        difficulty: r.difficulty,
        correctCount: r.correct_count,
        totalQuestions: r.total_questions,
        takenAt: r.finished_at ?? r.created_at,
      })),
    });
  } catch (e: any) {
    console.error("updated-listening/results error", e);
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
