export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase/server";
import { getResultViewer, scopeToViewer } from "@/lib/auth/resultViewer";

// speaking_results_2026 은 "과제(task) 1개 = 행 1개"다. 같은 test_id·같은 사용자의 행을 모아
// 하나의 시험 결과(문항 목록)로 돌려준다. 점수는 ETS rubric 0~4 → 화면용 0~10 으로 환산한다.
const toTen = (v: number | null | undefined) => Math.round(Number(v ?? 0) * 2.5 * 10) / 10;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ resultId: string }> }
) {
  try {
    const { resultId } = await params;
    const supabase = getServiceRoleClient();
    const viewer = await getResultViewer();
    if (!viewer) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    // id 는 uuid 문자열. (예전 숫자 파싱은 "12ab…" 같은 uuid 를 12 로 잘라 엉뚱한 행을 찾았다)
    const { data: anchor } = await scopeToViewer(
      supabase.from("speaking_results_2026").select("*"),
      viewer
    )
      .eq("id", resultId)
      .maybeSingle();

    if (!anchor) {
      return NextResponse.json({ ok: false, error: "Result not found" }, { status: 404 });
    }

    // 같은 시험·같은 사용자의 다른 과제 행들
    let sibQuery = supabase
      .from("speaking_results_2026")
      .select("*")
      .eq("test_id", anchor.test_id)
      .order("created_at", { ascending: true });
    sibQuery = anchor.user_id ? sibQuery.eq("user_id", anchor.user_id) : sibQuery.eq("id", anchor.id);
    const { data: siblings } = await sibQuery;

    // 과제별 최신 1건만
    const latestByTask = new Map<string, any>();
    for (const r of (siblings ?? []) as any[]) latestByTask.set(String(r.task_id), r);
    const rows = Array.from(latestByTask.values());

    const questions = rows.map((r, i) => {
      const meta = (r.meta ?? {}) as Record<string, any>;
      const score = toTen(r.final_total_score ?? r.ai_total_score);
      return {
        id: String(r.id),
        number: i + 1,
        type: String(meta.task_type ?? r.mode ?? "speaking"),
        prompt: String(r.prompt ?? ""),
        prepTime: Number(meta.prep_time ?? meta.prepTime ?? 15),
        responseTime: Number(meta.response_time ?? meta.responseTime ?? 45),
        userRecordingUrl: r.audio_url ?? undefined,
        modelAnswer: String(meta.model_answer ?? meta.modelAnswer ?? ""),
        isCorrect: score >= 6.25, // rubric 2.5/4 이상
        score,
        feedback: String(r.final_feedback ?? r.ai_feedback ?? ""),
      };
    });

    const avg = questions.length ? questions.reduce((a, q) => a + q.score, 0) / questions.length : 0;
    const score = Math.round(avg * 10) / 10;
    const band = score >= 8 ? "High" : score >= 5 ? "Medium" : "Low";

    return NextResponse.json({
      testId: anchor.test_id,
      testLabel: "Speaking Test",
      score,
      band,
      questions,
    });
  } catch (err: any) {
    console.error("[updated-speaking/result] error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
