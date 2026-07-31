import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { createReviewAttempt, type ReviewAttempt, type GrammarError } from "@/lib/review/reviewTracker";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, stage, grammarErrors } = body;

    if (!sessionId || !stage) {
      return NextResponse.json(
        { ok: false, error: "sessionId and stage are required" },
        { status: 400 }
      );
    }

    const supabase = await getServerSupabase();

    // 1. 기존 세션의 review_attempts 조회
    const { data: session, error: fetchErr } = await supabase
      .from("writing_2026_sessions")
      .select("review_attempts")
      .eq("id", sessionId)
      .single();

    if (fetchErr || !session) {
      return NextResponse.json(
        { ok: false, error: "Session not found" },
        { status: 404 }
      );
    }

    // 2. 새로운 attempt 추가
    const currentAttempts = (session.review_attempts || []) as ReviewAttempt[];
    const updatedAttempts = createReviewAttempt(
      currentAttempts,
      stage,
      {
        grammarErrors: grammarErrors as GrammarError[] | undefined,
      }
    );

    // 3. DB 업데이트
    const { error: updateErr } = await supabase
      .from("writing_2026_sessions")
      .update({ review_attempts: updatedAttempts })
      .eq("id", sessionId);

    if (updateErr) {
      console.error("[writing/add-attempt] update error:", updateErr);
      return NextResponse.json(
        { ok: false, error: "Failed to save attempt" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      attemptNum: updatedAttempts[updatedAttempts.length - 1].attemptNum,
      totalAttempts: updatedAttempts.length,
    });
  } catch (error: any) {
    console.error("[writing/add-attempt] error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
