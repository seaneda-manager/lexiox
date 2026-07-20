// apps/web/app/api/updated-reading/result/[resultId]/route.ts
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import type { RReadingTest2026 } from "@/models/reading";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ resultId: string }> }
) {
  try {
    const { resultId } = await params;
    const supabase = await getServerSupabase();

    // 1. 결과 데이터 조회
    const { data: resultData, error: resultError } = await supabase
      .from("reading_results_2026")
      .select("*")
      .eq("id", resultId)
      .single();

    if (resultError || !resultData) {
      return NextResponse.json(
        { ok: false, error: "Result not found" },
        { status: 404 }
      );
    }

    // 2. 테스트 정보 조회
    const { data: testData, error: testError } = await supabase
      .from("reading_tests_2026")
      .select("*")
      .eq("id", resultData.test_id)
      .single();

    if (testError || !testData) {
      return NextResponse.json(
        { ok: false, error: "Test not found" },
        { status: 404 }
      );
    }

    // 3. 테스트 데이터 파싱
    const testJson = testData.data as RReadingTest2026;
    const allItems = [
      ...testJson.modules[0].items,
      ...testJson.modules[1].items,
    ];

    // 4. 사용자 답변 파싱
    const userAnswers = resultData.answers as Record<string, string>;

    // 5. 모든 question_id 수집
    const questionIds = new Set<string>();
    for (const item of allItems) {
      if (item.taskKind === "complete_words") {
        const cw = item as any;
        for (const blank of cw.blanks ?? []) {
          questionIds.add(blank.id);
        }
      } else {
        const qs = (item as any).questions;
        for (const q of qs) {
          questionIds.add(q.id);
        }
      }
    }

    // 6. 설명 데이터 조회
    const { data: explanations } = await supabase
      .from("reading_question_explanations")
      .select("*")
      .in("question_id", Array.from(questionIds));

    const explanationMap = new Map(
      (explanations ?? []).map((e: any) => [e.question_id, e])
    );

    // 7. 문제별 결과 구성
    const questions = [];

    for (const item of allItems) {
      if (item.taskKind === "complete_words") {
        const cw = item as any;
        for (const blank of cw.blanks ?? []) {
          const isCorrect = userAnswers[blank.id] === blank.correctToken;
          const explanation = explanationMap.get(blank.id);
          questions.push({
            id: blank.id,
            number: questions.length + 1,
            stem: cw.paragraphHtml.substring(0, 100),
            type: "complete_words",
            itemType: `단어 채우기`,
            userAnswer: userAnswers[blank.id] ?? null,
            correctAnswer: blank.correctToken,
            isCorrect,
            explanation: explanation ?? null,
          });
        }
      } else {
        const qs = item.taskKind === "daily_life"
          ? (item as any).questions
          : (item as any).questions;

        for (const q of qs) {
          const correctChoice = q.choices.find(
            (c: any) => c.isCorrect === true || c.is_correct === true
          );
          const isCorrect = userAnswers[q.id] === correctChoice?.id;
          const explanation = explanationMap.get(q.id);
          questions.push({
            id: q.id,
            number: questions.length + 1,
            stem: q.stem,
            type: item.taskKind,
            itemType:
              item.taskKind === "daily_life"
                ? `일상 읽기 (${(item as any).contextType})`
                : "학술 지문",
            userAnswer: userAnswers[q.id] ?? null,
            correctAnswer: correctChoice?.text ?? "Unknown",
            isCorrect,
            explanation: explanation ?? null,
          });
        }
      }
    }

    // 6. Stage별 점수 계산
    const stage1Module = testJson.modules[0];
    const stage2Module = testJson.modules[1];

    let stage1Correct = 0,
      stage1Total = 0;
    let stage2Correct = 0,
      stage2Total = 0;

    for (const item of stage1Module.items) {
      if (item.taskKind === "complete_words") {
        const cw = item as any;
        for (const blank of cw.blanks ?? []) {
          stage1Total++;
          if (userAnswers[blank.id] === blank.correctToken) stage1Correct++;
        }
      } else {
        const qs = (item as any).questions;
        for (const q of qs) {
          stage1Total++;
          const correctChoice = q.choices.find(
            (c: any) => c.isCorrect === true || c.is_correct === true
          );
          if (userAnswers[q.id] === correctChoice?.id) stage1Correct++;
        }
      }
    }

    for (const item of stage2Module.items) {
      if (item.taskKind === "complete_words") {
        const cw = item as any;
        for (const blank of cw.blanks ?? []) {
          stage2Total++;
          if (userAnswers[blank.id] === blank.correctToken) stage2Correct++;
        }
      } else {
        const qs = (item as any).questions;
        for (const q of qs) {
          stage2Total++;
          const correctChoice = q.choices.find(
            (c: any) => c.isCorrect === true || c.is_correct === true
          );
          if (userAnswers[q.id] === correctChoice?.id) stage2Correct++;
        }
      }
    }

    return NextResponse.json({
      testId: resultData.test_id,
      testLabel: testJson.meta.label,
      stage1: {
        correct: stage1Correct,
        total: stage1Total,
        score: stage1Total > 0 ? Math.round((stage1Correct / stage1Total) * 100) : 0,
      },
      stage2: {
        correct: stage2Correct,
        total: stage2Total,
        score: stage2Total > 0 ? Math.round((stage2Correct / stage2Total) * 100) : 0,
      },
      questions,
    });
  } catch (err: any) {
    console.error("[updated-reading/result/[resultId]] error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
