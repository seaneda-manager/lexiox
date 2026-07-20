// app/api/speaking-2026/finalize-grade/route.ts
// 선생님이 최종 채점을 확정하는 엔드포인트
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { calcTotalScore, type EtsRubricScore } from "@/lib/speaking/rubric";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = await getServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    resultId: string;
    delivery: number;
    language: number;
    topic: number;
    feedback?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { resultId, delivery, language, topic, feedback = "" } = body;

  if (!resultId) {
    return NextResponse.json({ ok: false, error: "resultId required" }, { status: 400 });
  }

  for (const [key, val] of [["delivery", delivery], ["language", language], ["topic", topic]] as [string, number][]) {
    if (typeof val !== "number" || val < 0 || val > 4) {
      return NextResponse.json(
        { ok: false, error: `${key} must be 0–4` },
        { status: 422 },
      );
    }
  }

  const scores = {
    delivery: Math.round(delivery) as EtsRubricScore,
    language: Math.round(language) as EtsRubricScore,
    topic: Math.round(topic) as EtsRubricScore,
  };

  const totalScore = calcTotalScore(scores);

  const { error } = await supabase
    .from("speaking_results_2026")
    .update({
      final_delivery_score: scores.delivery,
      final_language_score: scores.language,
      final_topic_score: scores.topic,
      final_total_score: totalScore,
      final_feedback: feedback.trim() || null,
      graded_by: user.id,
      graded_at: new Date().toISOString(),
      grading_status: "teacher_graded",
    })
    .eq("id", resultId);

  if (error) {
    console.error("finalize-grade error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, totalScore });
}
