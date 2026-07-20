import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'placeholder' });

export async function POST(req: Request) {
  try {
    const { testId } = await req.json();

    if (!testId) {
      return NextResponse.json(
        { ok: false, error: "Missing testId" },
        { status: 400 }
      );
    }

    const supabase = await getServerSupabase();

    // 1. 테스트 조회
    const { data: testData, error: testError } = await supabase
      .from("reading_tests_2026")
      .select("payload")
      .eq("id", testId)
      .single();

    if (testError || !testData) {
      return NextResponse.json(
        { ok: false, error: "Test not found" },
        { status: 404 }
      );
    }

    const testPayload = testData.payload as any;
    const allItems = [
      ...testPayload.modules[0].items,
      ...testPayload.modules[1].items,
    ];

    console.log("[GENERATE] Test ID:", testId);
    console.log("[GENERATE] All items count:", allItems.length);
    console.log(
      "[GENERATE] Item taskKinds:",
      allItems.map((i: any) => i.taskKind)
    );

    // 2. 모든 questions 추출
    const questions: Array<{
      id: string;
      stem: string;
      choices: Array<{ id: string; text: string; isCorrect?: boolean }>;
      passageHtml?: string;
    }> = [];

    for (const item of allItems) {
      if (item.taskKind === "complete_words") {
        // complete_words는 스킵
        continue;
      } else {
        const qs = item.questions || [];
        console.log(
          `[GENERATE] Item ${item.id} (${item.taskKind}): ${qs.length} questions`
        );
        for (const q of qs) {
          questions.push({
            id: q.id,
            stem: q.stem,
            choices: q.choices,
            passageHtml: item.passageHtml || item.contentHtml,
          });
        }
      }
    }

    console.log("[GENERATE] Total questions found:", questions.length);

    // 3. Claude API로 각 question의 설명 생성
    const explanations: Array<{
      question_id: string;
      question_interpretation: string;
      evidence_interpretation: string;
      correct_choice_explanation: string;
      incorrect_choices: Array<{
        choiceId: string;
        interpretation: string;
        whyWrong: string;
      }>;
      vocabulary_notes: Record<string, string>;
    }> = [];

    for (let qIdx = 0; qIdx < questions.length; qIdx++) {
      const q = questions[qIdx];
      console.log(
        `[GENERATE] Generating explanation ${qIdx + 1}/${questions.length} for ${q.id}`
      );

      const correctChoice = q.choices.find((c) => c.isCorrect);
      const incorrectChoices = q.choices.filter((c) => !c.isCorrect);

      const prompt = `당신은 TOEFL Reading 문제의 해설을 작성하는 전문가입니다.

문제:
문항: ${q.stem}

선택지:
${q.choices.map((c, i) => `${String.fromCharCode(65 + i)}. ${c.text}`).join("\n")}

정답: ${correctChoice?.text || "Unknown"}

다음을 JSON 형식으로 작성해주세요 (한국어):
{
  "questionInterpretation": "이 문제가 무엇을 묻는가?",
  "evidenceInterpretation": "지문에서 정답과 관련된 부분의 해석",
  "correctChoiceExplanation": "정답이 맞는 이유",
  "incorrectChoices": [
    {"choiceId": "B", "interpretation": "선택지 해석", "whyWrong": "틀린 이유"}
  ],
  "vocabularyNotes": {"단어": "정의"}
}

JSON만 반환하세요.`;

      try {
        console.log(`[GENERATE] Calling Claude API for ${q.id}...`);
        const message = await client.messages.create({
          model: "claude-opus-4-8",
          max_tokens: 2000,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        });

        const content = message.content[0];
        if (content.type !== "text") {
          console.error(`[GENERATE] Invalid content type for ${q.id}`);
          continue;
        }

        console.log(
          `[GENERATE] Claude response for ${q.id}:`,
          content.text.substring(0, 100)
        );

        // JSON 파싱 (마크다운 포맷 처리)
        let jsonStr = content.text.trim();

        // ```json ... ``` 형식 제거
        if (jsonStr.includes("```json")) {
          jsonStr = jsonStr.split("```json")[1].split("```")[0].trim();
        } else if (jsonStr.includes("```")) {
          jsonStr = jsonStr.split("```")[1].split("```")[0].trim();
        }

        const parsed = JSON.parse(jsonStr);

        explanations.push({
          question_id: q.id,
          question_interpretation: parsed.questionInterpretation || "",
          evidence_interpretation: parsed.evidenceInterpretation || "",
          correct_choice_explanation: parsed.correctChoiceExplanation || "",
          incorrect_choices: parsed.incorrectChoices || [],
          vocabulary_notes: parsed.vocabularyNotes || {},
        });
        console.log(
          `[GENERATE] Successfully added explanation for ${q.id}`
        );
      } catch (e: any) {
        console.error(
          `[GENERATE] Failed to generate explanation for ${q.id}:`,
          e.message
        );
      }
    }

    console.log(`[GENERATE] Total explanations generated: ${explanations.length}`);

    // 4. DB에 저장 (upsert)
    const { error: insertError } = await supabase
      .from("reading_question_explanations")
      .upsert(
        explanations.map((exp) => ({
          question_id: exp.question_id,
          test_id: testId,
          question_interpretation: exp.question_interpretation,
          evidence_interpretation: exp.evidence_interpretation,
          correct_choice_explanation: exp.correct_choice_explanation,
          incorrect_choices: exp.incorrect_choices,
          vocabulary_notes: exp.vocabulary_notes,
        })),
        { onConflict: "question_id" }
      );

    if (insertError) {
      console.error("Insert error:", insertError);
      return NextResponse.json(
        { ok: false, error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      generated: explanations.length,
      message: `${explanations.length}개 설명 생성 완료`,
    });
  } catch (err: any) {
    console.error("[admin/reading/generate-explanations] error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
