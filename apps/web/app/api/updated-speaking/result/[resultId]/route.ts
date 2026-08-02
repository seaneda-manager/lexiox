import { NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ resultId: string }> }
) {
  try {
    const { resultId } = await params;
    console.log('[SPEAKING API] GET /api/updated-speaking/result/', resultId);
    const supabase = getServiceRoleClient();

    let resultData;
    const idNum = parseInt(resultId, 10);
    let { data: byId, error: byIdError } = await supabase
      .from("speaking_results_2026")
      .select("*")
      .eq("id", !isNaN(idNum) ? idNum : resultId)
      .single();

    if (!byIdError && byId) {
      resultData = byId;
    } else {
      const { data: byTestId } = await supabase
        .from("speaking_results_2026")
        .select("*")
        .eq("test_id", resultId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      resultData = byTestId;
      if (!resultData) {
        // 테스트 데이터 반환 (정답/오답 혼합)
        return NextResponse.json({
          testId: resultId,
          testLabel: "Speaking Test",
          score: 7.5,
          band: "High",
          questions: [
            {
              id: "q1",
              number: 1,
              type: "independent",
              prompt: "Describe a memorable trip you took.",
              prepTime: 15,
              responseTime: 45,
              userRecordingUrl: null,
              modelAnswer: "I took a trip to Tokyo. It was memorable because I visited Shibuya Crossing and tried authentic street food.",
              isCorrect: true,
              score: 8,
              feedback: "Excellent pronunciation and fluency.",
            },
            {
              id: "q2",
              number: 2,
              type: "independent",
              prompt: "If you could change one thing about your city, what would it be?",
              prepTime: 15,
              responseTime: 45,
              userRecordingUrl: null,
              modelAnswer: "I would improve public transportation. Better buses would reduce traffic.",
              isCorrect: false,
              score: 6,
              feedback: "Grammar could be clearer. Try more complex sentence structures.",
            },
            {
              id: "q3",
              number: 3,
              type: "independent",
              prompt: "Describe your favorite food and why you like it.",
              prepTime: 15,
              responseTime: 45,
              userRecordingUrl: null,
              modelAnswer: "My favorite food is sushi. I love it because it's fresh and delicious.",
              isCorrect: true,
              score: 7.5,
              feedback: "Clear and well-organized response.",
            },
          ],
        });
      }
    }

    return NextResponse.json({
      testId: resultData.test_id,
      testLabel: "Speaking Test",
      score: resultData.score || 0,
      band: "Medium",
      questions: [],
    });
  } catch (err: any) {
    console.error("[updated-speaking/result] error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
