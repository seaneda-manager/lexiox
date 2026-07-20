// app/api/writing-2026/finalize-grade/route.ts
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { calcWritingTotal, type EtsWritingScore } from "@/lib/writing/rubric";

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
    email: number;
    discussion: number;
    feedback?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { sessionId, email, discussion, feedback = "" } = body;

  if (!sessionId) {
    return NextResponse.json({ ok: false, error: "sessionId required" }, { status: 400 });
  }

  for (const [key, val] of [["email", email], ["discussion", discussion]] as [string, number][]) {
    if (typeof val !== "number" || val < 0 || val > 5) {
      return NextResponse.json({ ok: false, error: `${key} must be 0–5` }, { status: 422 });
    }
  }

  const scores = {
    email: Math.round(email) as EtsWritingScore,
    discussion: Math.round(discussion) as EtsWritingScore,
  };

  const totalScore = calcWritingTotal(scores);

  const { error } = await supabase
    .from("writing_2026_sessions")
    .update({
      final_email_score: scores.email,
      final_discussion_score: scores.discussion,
      final_total_score: totalScore,
      final_grade_feedback: feedback.trim() || null,
      graded_by: user.id,
      graded_at: new Date().toISOString(),
      grading_status: "teacher_graded",
    })
    .eq("id", sessionId);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, totalScore });
}
