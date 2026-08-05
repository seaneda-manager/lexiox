export const dynamic = 'force-dynamic';

/**
 * GET /api/review/get-review-data
 *
 * Query params:
 *   - type: 'writing' | 'speaking'
 *   - sessionId or resultId: 세션/결과 ID
 *
 * Returns: 모든 리뷰 attempt + 분석 데이터
 */

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { analyzeErrorProgress, detectRepeatedErrors, type ReviewAttempt } from "@/lib/review/reviewTracker";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // 'writing' | 'speaking'
    const sessionId = searchParams.get("sessionId");
    const resultId = searchParams.get("resultId");

    if (!type || (!sessionId && !resultId)) {
      return NextResponse.json(
        { ok: false, error: "type and (sessionId or resultId) are required" },
        { status: 400 }
      );
    }

    const supabase = await getServerSupabase();
    let reviewAttempts: ReviewAttempt[] = [];

    if (type === "writing") {
      const { data, error } = await supabase
        .from("writing_2026_sessions")
        .select("review_attempts")
        .eq("id", sessionId)
        .single();

      if (error || !data) {
        return NextResponse.json(
          { ok: false, error: "Session not found" },
          { status: 404 }
        );
      }

      reviewAttempts = (data.review_attempts || []) as ReviewAttempt[];
    } else if (type === "speaking") {
      const { data, error } = await supabase
        .from("speaking_results_2026")
        .select("review_attempts")
        .eq("id", resultId)
        .single();

      if (error || !data) {
        return NextResponse.json(
          { ok: false, error: "Result not found" },
          { status: 404 }
        );
      }

      reviewAttempts = (data.review_attempts || []) as ReviewAttempt[];
    }

    // 분석 데이터 생성
    const analysis = {
      totalAttempts: reviewAttempts.length,
      stages: reviewAttempts.map(a => a.stage),

      // 각 attempt 간 변화 분석
      progressionAnalysis: reviewAttempts.map((attempt, idx) => {
        const previousAttempt = idx > 0 ? reviewAttempts[idx - 1] : undefined;
        const { improvementPoints, concernPoints } = analyzeErrorProgress(
          attempt,
          previousAttempt
        );

        return {
          attemptNum: attempt.attemptNum,
          stage: attempt.stage,
          improvements: improvementPoints,
          concerns: concernPoints,
        };
      }),

      // 반복되는 오류 감지
      repeatedErrors: detectRepeatedErrors(reviewAttempts),

      // 현재 (마지막) attempt의 오류 요약
      currentErrors: reviewAttempts.length > 0 ? {
        grammarErrors: reviewAttempts[reviewAttempts.length - 1].grammarErrors || [],
        pronunciationErrors: reviewAttempts[reviewAttempts.length - 1].pronunciationErrors || [],
        expressionErrors: reviewAttempts[reviewAttempts.length - 1].expressionErrors || [],
      } : null,
    };

    return NextResponse.json({
      ok: true,
      type,
      attempts: reviewAttempts,
      analysis,
    });
  } catch (error: any) {
    console.error("[review/get-review-data] error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
