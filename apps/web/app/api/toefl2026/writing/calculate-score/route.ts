export const dynamic = 'force-dynamic';

/**
 * POST /api/toefl2026/writing/calculate-score
 *
 * Writing 점수 계산 및 저장
 *
 * Request Body:
 * {
 *   "writingAnswerId": uuid,
 *   "task2RubricScore": 0~5,
 *   "task3RubricScore": 0~5
 * }
 */

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import {
  calculateWritingScoreWithRubric,
  parseWritingRawAnswers,
} from "@/lib/toefl2026/writingScoreCalculator";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { writingAnswerId, task2RubricScore = 0, task3RubricScore = 0 } = body;

    if (!writingAnswerId) {
      return NextResponse.json(
        { ok: false, error: "writingAnswerId is required" },
        { status: 400 }
      );
    }

    const supabase = await getServerSupabase();

    // 1. writing_2026_answers에서 답변 조회
    const { data: writingAnswer, error: fetchError } = await supabase
      .from("writing_2026_answers")
      .select("*")
      .eq("id", writingAnswerId)
      .single();

    if (fetchError || !writingAnswer) {
      return NextResponse.json(
        { ok: false, error: "Writing answer not found" },
        { status: 404 }
      );
    }

    // 2. raw_answers 파싱
    const parsed = parseWritingRawAnswers(writingAnswer.raw_answers);

    // 3. 점수 계산
    const result = calculateWritingScoreWithRubric(
      writingAnswer.raw_answers,
      task2RubricScore,
      task3RubricScore
    );

    // 4. DB 업데이트
    const { error: updateError } = await supabase
      .from("writing_2026_answers")
      .update({
        ai_total_score: result.meanRubricScore,
        ai_grade_feedback: JSON.stringify({
          task1ConvertedScore: result.task1ConvertedScore,
          task2RubricScore,
          task3RubricScore,
          bandScore: result.bandScore,
          legacyScaledScore: result.legacyScaledScore,
          cefrLevel: result.cefrLevel,
        }),
        final_email_score: task2RubricScore,
        final_discussion_score: task3RubricScore,
        final_total_score: result.meanRubricScore,
        final_grade_feedback: result.cefrLevel,
        grading_status: "graded",
        graded_by: "ai",
        graded_at: new Date().toISOString(),
      })
      .eq("id", writingAnswerId);

    if (updateError) {
      console.error("[writing/calculate-score] update error:", updateError);
      return NextResponse.json(
        { ok: false, error: "Failed to save score" },
        { status: 500 }
      );
    }

    // 5. 응답
    return NextResponse.json({
      ok: true,
      writingAnswerId,
      score: result,
      submission: {
        task1CorrectCount: parsed.task1CorrectCount,
        task2Submission: parsed.task2Submission,
        task3Submission: parsed.task3Submission,
      },
    });
  } catch (error: any) {
    console.error("[writing/calculate-score] error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
