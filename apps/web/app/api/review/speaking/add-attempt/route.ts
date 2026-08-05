export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { createReviewAttempt, type ReviewAttempt, type GrammarError, type PronunciationError } from "@/lib/review/reviewTracker";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { resultId, stage, grammarErrors, pronunciationErrors, expressionErrors } = body;

    if (!resultId || !stage) {
      return NextResponse.json(
        { ok: false, error: "resultId and stage are required" },
        { status: 400 }
      );
    }

    const supabase = await getServerSupabase();

    // 1. 기존 결과의 review_attempts 조회
    const { data: result, error: fetchErr } = await supabase
      .from("speaking_results_2026")
      .select("review_attempts")
      .eq("id", resultId)
      .single();

    if (fetchErr || !result) {
      return NextResponse.json(
        { ok: false, error: "Result not found" },
        { status: 404 }
      );
    }

    // 2. 새로운 attempt 추가
    const currentAttempts = (result.review_attempts || []) as ReviewAttempt[];
    const updatedAttempts = createReviewAttempt(
      currentAttempts,
      stage,
      {
        grammarErrors: grammarErrors as GrammarError[] | undefined,
        pronunciationErrors: pronunciationErrors as PronunciationError[] | undefined,
        expressionErrors: expressionErrors as GrammarError[] | undefined,
      }
    );

    // 3. DB 업데이트
    const { error: updateErr } = await supabase
      .from("speaking_results_2026")
      .update({ review_attempts: updatedAttempts })
      .eq("id", resultId);

    if (updateErr) {
      console.error("[speaking/add-attempt] update error:", updateErr);
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
    console.error("[speaking/add-attempt] error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
