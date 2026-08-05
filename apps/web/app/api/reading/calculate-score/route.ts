export const dynamic = 'force-dynamic';

/**
 * POST /api/reading/calculate-score
 *
 * Reading 점수를 계산하고 reading_results_2026에 저장
 *
 * Request Body:
 * {
 *   "resultId": number,
 *   "testId": string
 * }
 */

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { calculateReadingScore, convertAnswersToScoreArray } from "@/lib/reading/scoreCalculator";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { resultId, testId } = body;

    if (!resultId) {
      return NextResponse.json(
        { ok: false, error: "resultId is required" },
        { status: 400 }
      );
    }

    const supabase = await getServerSupabase();

    // 1. reading_results_2026에서 학생 답변 조회
    const { data: result, error: resultError } = await supabase
      .from("reading_results_2026")
      .select("*")
      .eq("id", resultId)
      .single();

    if (resultError || !result) {
      return NextResponse.json(
        { ok: false, error: "Result not found" },
        { status: 404 }
      );
    }

    // 2. reading_questions에서 문제별 정답 및 가중치 조회
    const { data: questions, error: questionsError } = await supabase
      .from("reading_questions")
      .select("id, type, weight");

    if (questionsError) {
      return NextResponse.json(
        { ok: false, error: "Failed to load questions" },
        { status: 500 }
      );
    }

    // 3. reading_choices에서 각 문제의 정답 조회
    const { data: choices, error: choicesError } = await supabase
      .from("reading_choices")
      .select("id, question_id, is_correct");

    if (choicesError) {
      return NextResponse.json(
        { ok: false, error: "Failed to load choices" },
        { status: 500 }
      );
    }

    // 4. 문제 ID별 정답 맵 생성
    const questionMap: Record<string, any> = {};

    questions?.forEach((q) => {
      const correctChoices = choices?.filter(
        (c) => c.question_id === q.id && c.is_correct
      );

      questionMap[q.id] = {
        type: q.type,
        weight: q.weight || 1,
        correctChoices: correctChoices?.map((c) => c.id) || [],
      };
    });

    // 5. 학생 답변과 정답 비교하여 채점
    const scoreArray = Object.entries(result.answers).map(([qId, studentAnswer]) => {
      const question = questionMap[qId];

      if (!question) {
        return {
          questionId: qId,
          isCorrect: false,
          weight: 1,
        };
      }

      // 학생 답과 정답 비교
      const isCorrect = Array.isArray(question.correctChoices)
        ? question.correctChoices.includes(studentAnswer)
        : studentAnswer === question.correctChoices?.[0];

      return {
        questionId: qId,
        isCorrect,
        weight: question.weight || 1,
      };
    });

    // 6. Conversion Table 조회 (test_id 또는 'default' 사용)
    const { data: conversionData } = await supabase
      .from("score_conversion_tables")
      .select("raw_score, scaled_score")
      .eq("section", "reading")
      .or(`test_id.eq.${testId},test_id.eq.default`)
      .order("test_id", { ascending: false }); // testId 우선, 없으면 default

    // Conversion Table을 Object로 변환
    const conversionTable: Record<number, number> = {};
    conversionData?.forEach((row) => {
      conversionTable[row.raw_score] = row.scaled_score;
    });

    // 7. 점수 계산
    const scoringResult = calculateReadingScore(scoreArray, conversionTable);

    // 8. reading_results_2026에 점수 저장
    const { error: updateError } = await supabase
      .from("reading_results_2026")
      .update({
        raw_score: scoringResult.rawScore,
        scaled_score: scoringResult.scaledScore,
        percentage: scoringResult.percentage,
      })
      .eq("id", resultId);

    if (updateError) {
      console.error("[reading/calculate-score] update error:", updateError);
      return NextResponse.json(
        { ok: false, error: "Failed to save score" },
        { status: 500 }
      );
    }

    // 9. 응답 반환
    return NextResponse.json({
      ok: true,
      resultId,
      scoring: scoringResult,
    });
  } catch (error: any) {
    console.error("[reading/calculate-score] error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
