// apps/web/app/api/updated-reading/results/route.ts
//
// 로그인한 학생이 지금까지 푼 Reading 결과 목록. Review 모드의 진입점이 된다.
// 정답 수는 reading_results_2026에 컬럼이 없어 저장하지 않는다 — 상세 화면에서
// 시험 페이로드와 답안으로 재계산한다. 목록에서는 응시 시각과 문항 수만 보여준다.
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
      .from("reading_results_2026")
      .select("id, test_id, total_questions, is_adaptive, stage2_difficulty, finished_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    // 시험 제목은 별도 조회해서 붙인다 (결과 테이블에 label 컬럼이 없다).
    const testIds = Array.from(new Set((results ?? []).map((r) => r.test_id).filter(Boolean)));
    const labelById = new Map<string, string>();

    if (testIds.length) {
      const { data: tests, error: testError } = await supabase
        .from("reading_tests_2026")
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
        totalQuestions: r.total_questions,
        isAdaptive: r.is_adaptive,
        stage2Difficulty: r.stage2_difficulty,
        takenAt: r.finished_at ?? r.created_at,
      })),
    });
  } catch (e: any) {
    console.error("updated-reading/results error", e);
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
