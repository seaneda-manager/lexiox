// app/api/writing-2026/finalize-grade/route.ts
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { calcWritingRawScore, calcWritingBandScore, type EtsWritingScore } from "@/lib/writing/rubric";

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
    sessionId: string;
    buildASentence: number;
    email: number;
    discussion: number;
    feedback?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { sessionId, buildASentence, email, discussion, feedback = "" } = body;

  if (!sessionId) {
    return NextResponse.json({ ok: false, error: "sessionId required" }, { status: 400 });
  }

  // 검증
  if (typeof buildASentence !== "number" || buildASentence < 0 || buildASentence > 10) {
    return NextResponse.json({ ok: false, error: "buildASentence must be 0–10" }, { status: 422 });
  }
  for (const [key, val] of [["email", email], ["discussion", discussion]] as [string, number][]) {
    if (typeof val !== "number" || val < 0 || val > 5) {
      return NextResponse.json({ ok: false, error: `${key} must be 0–5` }, { status: 422 });
    }
  }

  const scores = {
    buildASentence,
    email: Math.round(email) as EtsWritingScore,
    discussion: Math.round(discussion) as EtsWritingScore,
  };

  // 가중치 공식으로 원점수 + 밴드 점수 계산
  const rawScore = calcWritingRawScore(scores);
  const bandScore = calcWritingBandScore(rawScore);

  // 1. writing_2026_sessions 업데이트
  const { error: sessionError } = await supabase
    .from("writing_2026_sessions")
    .update({
      final_build_a_sentence_score: scores.buildASentence,
      final_email_score: scores.email,
      final_discussion_score: scores.discussion,
      final_total_score: Math.round(rawScore * 100) / 100, // 원점수 (0~30)
      final_grade_feedback: feedback.trim() || null,
      graded_by: user.id,
      graded_at: new Date().toISOString(),
      grading_status: "teacher_graded",
    })
    .eq("id", sessionId);

  if (sessionError) {
    return NextResponse.json({ ok: false, error: sessionError.message }, { status: 500 });
  }

  // 2. writing_2026_answers에도 점수 저장
  const { data: answers, error: answerFetchError } = await supabase
    .from("writing_2026_answers")
    .select("id")
    .eq("session_id", sessionId)
    .limit(1);

  if (!answerFetchError && answers && answers.length > 0) {
    const answerId = answers[0].id;

    await supabase
      .from("writing_2026_answers")
      .update({
        final_build_a_sentence_score: scores.buildASentence,
        final_email_score: scores.email,
        final_discussion_score: scores.discussion,
        final_total_score: Math.round(rawScore * 100) / 100,
        final_grade_feedback: feedback.trim() || null,
        grading_status: "teacher_graded",
        graded_at: new Date().toISOString(),
      })
      .eq("id", answerId);
  }

  return NextResponse.json({ ok: true, bandScore, rawScore });
}
