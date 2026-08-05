export const dynamic = 'force-dynamic';

/**
 * POST /api/toefl2026/calculate-band
 *
 * TOEFL 2026 1.0~6.0 Band Score 자동 계산
 *
 * Request Body:
 * {
 *   "readingResultId": number,
 *   "listeningResultId": number,
 *   "speakingResultId": number,
 *   "writingResultId": number
 * }
 */

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import {
  calculateAdaptiveBandScore,
  calculateFixedBandScore,
  calculateOverallBand,
  createOverallResult,
  type Answer,
} from "@/lib/toefl2026/bandScoreCalculator";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { readingResultId, listeningResultId, speakingResultId, writingResultId } = body;

    if (!readingResultId || !listeningResultId) {
      return NextResponse.json(
        { ok: false, error: "readingResultId and listeningResultId are required" },
        { status: 400 }
      );
    }

    const supabase = await getServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 1. Reading & Listening 결과 조회 (Adaptive)
    let readingBand = 1.0;
    let listeningBand = 1.0;

    if (readingResultId) {
      const { data: readingResult } = await supabase
        .from("reading_results_2026")
        .select("*")
        .eq("id", readingResultId)
        .single();

      if (readingResult) {
        // Module 1, Module 2 답변 분리 (실제로는 별도 테이블에서 조회)
        const m1Answers: Answer[] = [];
        const m2Answers: Answer[] = [];

        // 여기서는 기존 answers JSON을 활용
        // 실제로는 reading_answers 테이블에서 조회하는 것이 이상적

        if (m1Answers.length > 0 || m2Answers.length > 0) {
          const result = calculateAdaptiveBandScore(m1Answers, m2Answers);
          readingBand = result.bandScore;

          // DB 업데이트
          await supabase
            .from("reading_results_2026")
            .update({
              m1_raw_score: result.rawScore, // 임시
              difficulty_path: result.path,
              band_score: result.bandScore,
              accuracy_percent: result.accuracy,
            })
            .eq("id", readingResultId);
        }
      }
    }

    if (listeningResultId) {
      const { data: listeningResult } = await supabase
        .from("listening_results_2026")
        .select("*")
        .eq("id", listeningResultId)
        .single();

      if (listeningResult) {
        const m1Answers: Answer[] = [];
        const m2Answers: Answer[] = [];

        if (m1Answers.length > 0 || m2Answers.length > 0) {
          const result = calculateAdaptiveBandScore(m1Answers, m2Answers);
          listeningBand = result.bandScore;

          await supabase
            .from("listening_results_2026")
            .update({
              difficulty_path: result.path,
              band_score: result.bandScore,
              accuracy_percent: result.accuracy,
            })
            .eq("id", listeningResultId);
        }
      }
    }

    // 2. Speaking & Writing 결과 조회 (Fixed)
    let speakingBand = 1.0;
    let writingBand = 1.0;

    if (speakingResultId) {
      const { data: speakingResult } = await supabase
        .from("speaking_results_2026")
        .select("*")
        .eq("id", speakingResultId)
        .single();

      if (speakingResult?.task_scores) {
        const taskScores = Array.isArray(speakingResult.task_scores)
          ? speakingResult.task_scores
          : Object.values(speakingResult.task_scores);

        speakingBand = calculateFixedBandScore(taskScores as number[]);

        await supabase
          .from("speaking_results_2026")
          .update({
            avg_rubric_score:
              (taskScores as number[]).reduce((a: number, b: number) => a + b, 0) /
              (taskScores as number[]).length,
            band_score: speakingBand,
          })
          .eq("id", speakingResultId);
      }
    }

    if (writingResultId) {
      const { data: writingResult } = await supabase
        .from("writing_2026_answers")
        .select("*")
        .eq("id", writingResultId)
        .single();

      if (writingResult?.rubric_score) {
        writingBand = calculateFixedBandScore([writingResult.rubric_score]);

        await supabase
          .from("writing_2026_answers")
          .update({
            band_score: writingBand,
          })
          .eq("id", writingResultId);
      }
    }

    // 3. Overall Band Score 계산
    const overallResult = createOverallResult(
      readingBand,
      listeningBand,
      speakingBand,
      writingBand
    );

    // 4. toefl_test_results에 저장
    const { data: testResult, error: insertError } = await supabase
      .from("toefl_test_results")
      .insert({
        user_id: user.id,
        test_session_id: `${Date.now()}-${user.id}`,
        reading_band: readingBand,
        listening_band: listeningBand,
        speaking_band: speakingBand,
        writing_band: writingBand,
        overall_band: overallResult.overallBand,
        completed_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (insertError) {
      console.error("[toefl2026/calculate-band] insert error:", insertError);
      return NextResponse.json(
        { ok: false, error: "Failed to save test result" },
        { status: 500 }
      );
    }

    // 5. 응답
    return NextResponse.json({
      ok: true,
      testResultId: testResult?.id,
      bands: overallResult,
    });
  } catch (error: any) {
    console.error("[toefl2026/calculate-band] error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
