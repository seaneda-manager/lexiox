// app/api/writing-2026/finalize-grade/route.ts
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { requireTeacherOrAdmin } from "@/lib/auth/requireTeacherOrAdmin";
import { calcWritingRawScore, calcWritingBandScore, type EtsWritingScore } from "@/lib/writing/rubric";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // 채점 확정은 선생님/관리자만 — 학생이 자기 점수를 직접 쓰지 못하게 한다.
  let user: { id: string };
  try {
    ({ user } = await requireTeacherOrAdmin());
  } catch (e) {
    const m = e instanceof Error ? e.message : "";
    const status = m.startsWith("401") ? 401 : m.startsWith("403") ? 403 : 500;
    return NextResponse.json({ ok: false, error: status === 500 ? "auth check failed" : m }, { status });
  }
  const supabase = await getServerSupabase();

  let body: {
    sessionId: string;
    buildASentence: number;
    email: number;
    discussion: number;
    feedback?: string;
    /** true면 AI 상세 분석(기준별 점수·오류 목록)을 학생에게 공개한다. */
    shareAiDetail?: boolean;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { sessionId, buildASentence, email, discussion, feedback = "", shareAiDetail = false } = body;

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

  // 1-b. AI 상세 분석 공개 여부 — ai_grade_detail.sharedWithStudent (컬럼이 없으면 건너뜀)
  const { data: detailRow, error: detailReadErr } = await supabase
    .from("writing_2026_sessions")
    .select("ai_grade_detail")
    .eq("id", sessionId)
    .maybeSingle();
  const existingDetail = !detailReadErr ? (detailRow as any)?.ai_grade_detail : null;
  if (existingDetail && typeof existingDetail === "object") {
    await supabase
      .from("writing_2026_sessions")
      .update({ ai_grade_detail: { ...existingDetail, sharedWithStudent: !!shareAiDetail } })
      .eq("id", sessionId);
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
