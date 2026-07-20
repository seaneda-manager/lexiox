// app/api/speaking-2026/grade/route.ts
// AI 자동 채점 엔드포인트 (Claude → ETS rubric 0~4)
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getServerSupabase } from "@/lib/supabase/server";
import {
  buildGradingSystemPrompt,
  calcTotalScore,
  parseGradingJson,
  type TaskContext,
} from "@/lib/speaking/rubric";

export const dynamic = "force-dynamic";

const getAI = () =>
  new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  const supabase = await getServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let resultId: string;
  try {
    ({ resultId } = (await req.json()) as { resultId: string });
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!resultId) {
    return NextResponse.json({ ok: false, error: "resultId required" }, { status: 400 });
  }

  // 결과 조회
  const { data: row, error: fetchErr } = await supabase
    .from("speaking_results_2026")
    .select("id, script, prompt, mode, test_id, task_id, grading_status")
    .eq("id", resultId)
    .maybeSingle();

  if (fetchErr || !row) {
    return NextResponse.json({ ok: false, error: "Result not found" }, { status: 404 });
  }

  if (!row.script?.trim()) {
    return NextResponse.json({ ok: false, error: "No transcript to grade" }, { status: 422 });
  }

  // task 타입 추론 (integrated task는 task2/task3/task4 형태)
  const taskContext: TaskContext =
    row.task_id?.match(/task[2-4]$/i) ? "integrated" : "independent";

  const systemPrompt = buildGradingSystemPrompt(taskContext);

  const userContent = [
    row.prompt ? `**Task Prompt:**\n${row.prompt}\n\n` : "",
    `**Student Response (transcript):**\n${row.script}`,
  ]
    .join("")
    .trim();

  try {
    const ai = getAI();
    const msg = await ai.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
    });

    const raw =
      msg.content[0]?.type === "text" ? msg.content[0].text : "";

    const grading = parseGradingJson(raw);

    if (!grading) {
      console.error("Failed to parse AI grading response:", raw);
      return NextResponse.json(
        { ok: false, error: "AI response parse error", raw },
        { status: 500 },
      );
    }

    // DB 업데이트
    const { error: updateErr } = await supabase
      .from("speaking_results_2026")
      .update({
        ai_delivery_score: grading.scores.delivery,
        ai_language_score: grading.scores.language,
        ai_topic_score: grading.scores.topic,
        ai_total_score: grading.totalScore,
        ai_feedback: grading.feedback,
        ai_graded_at: new Date().toISOString(),
        grading_status: "ai_graded",
      })
      .eq("id", resultId);

    if (updateErr) {
      console.error("Failed to update speaking result:", updateErr);
      return NextResponse.json(
        { ok: false, error: updateErr.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, grading });
  } catch (err) {
    console.error("AI grading error:", err);
    return NextResponse.json(
      { ok: false, error: "AI grading failed" },
      { status: 500 },
    );
  }
}
