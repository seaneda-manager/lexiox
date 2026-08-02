import { NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ resultId: string }> }
) {
  try {
    const { resultId } = await params;
    console.log("[API] GET /api/updated-listening/result/", resultId);
    const supabase = getServiceRoleClient();

    let resultData, resultError;

    const idNum = parseInt(resultId, 10);
    let { data: byId, error: byIdError } = await supabase
      .from("listening_results_2026")
      .select("*")
      .eq("id", !isNaN(idNum) ? idNum : resultId)
      .single();

    if (!byIdError && byId) {
      resultData = byId;
      resultError = null;
    } else {
      const { data: byAssignmentId, error: byAssignmentError } = await supabase
        .from("listening_results_2026")
        .select("*")
        .eq("assignment_id", resultId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!byAssignmentError && byAssignmentId) {
        resultData = byAssignmentId;
        resultError = null;
      } else {
        const { data: byTestId, error: byTestIdError } = await supabase
          .from("listening_results_2026")
          .select("*")
          .eq("test_id", resultId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        resultData = byTestId;
        resultError = byTestIdError;
      }
    }

    if (resultError || !resultData) {
      return NextResponse.json(
        { ok: false, error: "Result not found" },
        { status: 404 }
      );
    }

    const { data: testData, error: testError } = await supabase
      .from("listening_tests_2026")
      .select("*")
      .eq("id", resultData.test_id)
      .single();

    if (testError || !testData) {
      return NextResponse.json(
        { ok: false, error: "Test not found" },
        { status: 404 }
      );
    }

    const testJson = testData.payload as any;
    if (!testJson?.items?.length) {
      return NextResponse.json(
        { ok: false, error: "Test payload is empty" },
        { status: 500 }
      );
    }

    let userAnswers: Record<string, string> = {};
    if (resultData.answers) {
      if (Array.isArray(resultData.answers)) {
        for (const entry of resultData.answers as any[]) {
          const id = entry?.questionId ?? entry?.question_id;
          const answer = entry?.chosenChoiceId ?? entry?.answer;
          if (id && answer) userAnswers[id] = String(answer);
        }
      } else if (typeof resultData.answers === "object") {
        for (const [k, v] of Object.entries(resultData.answers)) {
          userAnswers[k] = String(v ?? "");
        }
      }
    }

    const questionIds = new Set<string>();
    for (const item of testJson.items) {
      if (item.questions) {
        for (const q of item.questions) {
          questionIds.add(q.id);
        }
      }
    }

    const { data: explanations } = await supabase
      .from("listening_question_explanations")
      .select("*")
      .in("question_id", Array.from(questionIds));

    const explanationMap = new Map(
      (explanations ?? []).map((e: any) => [e.question_id, e])
    );

    const questions = [];
    let number = 1;

    for (const item of testJson.items) {
      const audioUrl = item.audioUrl || item.audio_url || "";

      if (item.questions) {
        for (const q of item.questions) {
          const correctChoice = q.choices?.find(
            (c: any) => c.isCorrect === true || c.is_correct === true
          );
          const userAnswer = userAnswers[q.id];
          const isCorrect = userAnswer === correctChoice?.id;
          const explanation = explanationMap.get(q.id);

          questions.push({
            id: q.id,
            number: number++,
            stem: q.stem || q.question || "",
            audioUrl,
            choices: q.choices || [],
            type: "listening",
            itemType: "리스닝",
            userAnswer: userAnswer || null,
            correctAnswer: correctChoice?.text ?? "Unknown",
            correctChoiceId: correctChoice?.id,
            isCorrect,
            explanation: explanation ?? null,
          });
        }
      }
    }

    const correctCount = questions.filter((q) => q.isCorrect).length;
    const score = Math.round((correctCount / questions.length) * 100) || 0;

    return NextResponse.json({
      testId: resultData.test_id,
      testLabel: testData.label ?? "Listening Test",
      score,
      correct: correctCount,
      total: questions.length,
      questions,
    });
  } catch (err: any) {
    console.error("[updated-listening/result] error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
