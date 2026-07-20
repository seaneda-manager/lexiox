// app/api/writing-2026/grade/route.ts
// AI 자동 채점 엔드포인트 (Claude → ETS Writing rubric 0~5)
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getServerSupabase } from "@/lib/supabase/server";
import {
  buildWritingGradingSystemPrompt,
  calcWritingTotal,
  parseWritingGradingJson,
} from "@/lib/writing/rubric";
import type { WWritingTest2026 } from "@/models/writing";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const getAI = () => new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let sessionId: string;
  try {
    ({ sessionId } = (await req.json()) as { sessionId: string });
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!sessionId) {
    return NextResponse.json({ ok: false, error: "sessionId required" }, { status: 400 });
  }

  const { data: session, error: fetchErr } = await supabase
    .from("writing_2026_sessions")
    .select("id, test_id, raw_answers, grading_status")
    .eq("id", sessionId)
    .maybeSingle();

  if (fetchErr || !session) {
    return NextResponse.json({ ok: false, error: "Session not found" }, { status: 404 });
  }

  const answers = (session.raw_answers ?? {}) as Record<string, string>;
  if (!Object.values(answers).some((v) => v?.trim())) {
    return NextResponse.json({ ok: false, error: "No answers to grade" }, { status: 422 });
  }

  // 테스트 구조로 프롬프트 컨텍스트 구성
  let testContext = "";
  const { data: testRow } = await supabase
    .from("writing_tests")
    .select("label, payload")
    .eq("id", session.test_id)
    .maybeSingle();

  if (testRow?.payload) {
    const test = testRow.payload as WWritingTest2026;
    testContext = test.items
      .map((item) => {
        if (item.taskKind === "email") {
          return `[Email Writing Task]\nSituation: ${item.situation}\nPrompt: ${item.prompt}`;
        }
        if (item.taskKind === "academic_discussion") {
          return `[Academic Discussion Task]\nContext: ${item.context}\nProfessor: ${item.professorPrompt}`;
        }
        return null;
      })
      .filter(Boolean)
      .join("\n\n");
  }

  const answersText = Object.entries(answers)
    .filter(([, v]) => v?.trim())
    .map(([k, v]) => `[${k}]\n${v}`)
    .join("\n\n");

  const userContent = [
    testContext ? `**Task Prompts:**\n${testContext}\n\n` : "",
    `**Student Answers:**\n${answersText}`,
  ]
    .join("")
    .trim();

  try {
    const ai = getAI();
    const msg = await ai.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: buildWritingGradingSystemPrompt(),
      messages: [{ role: "user", content: userContent }],
    });

    const raw = msg.content[0]?.type === "text" ? msg.content[0].text : "";
    const grading = parseWritingGradingJson(raw);

    if (!grading) {
      console.error("Failed to parse writing grading response:", raw);
      return NextResponse.json({ ok: false, error: "AI response parse error", raw }, { status: 500 });
    }

    const { error: updateErr } = await supabase
      .from("writing_2026_sessions")
      .update({
        ai_email_score: grading.scores.email,
        ai_discussion_score: grading.scores.discussion,
        ai_total_score: grading.totalScore,
        ai_grade_feedback: grading.feedback,
        ai_graded_at: new Date().toISOString(),
        grading_status: "ai_graded",
      })
      .eq("id", sessionId);

    if (updateErr) {
      return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, grading });
  } catch (err) {
    console.error("Writing AI grading error:", err);
    return NextResponse.json({ ok: false, error: "AI grading failed" }, { status: 500 });
  }
}
