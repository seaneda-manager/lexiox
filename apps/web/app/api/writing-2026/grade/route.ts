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

  const answers = (session.raw_answers ?? {}) as Record<string, any>;
  const hasAnswers = Object.values(answers).some((v) => {
    if (typeof v === "string") return v.trim().length > 0;
    if (typeof v === "object" && v !== null && "content" in v) return String(v.content).trim().length > 0;
    return false;
  });
  if (!hasAnswers) {
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
    .filter(([, v]) => {
      if (typeof v === "string") return v.trim().length > 0;
      if (typeof v === "object" && v !== null && "content" in v) return String(v.content).trim().length > 0;
      return false;
    })
    .map(([k, v]) => {
      const content = typeof v === "string" ? v : (v && typeof v === "object" && "content" in v ? String(v.content) : String(v));
      return `[${k}]\n${content}`;
    })
    .join("\n\n");

  const userContent = [
    testContext ? `**Task Prompts:**\n${testContext}\n\n` : "",
    `**Student Answers:**\n${answersText}`,
  ]
    .join("")
    .trim();

  try {
    const ai = getAI();
    console.log("[Writing Grade] Starting AI grading for session:", sessionId);

    const msg = await ai.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: buildWritingGradingSystemPrompt(),
      messages: [{ role: "user", content: userContent }],
    });

    const raw = msg.content[0]?.type === "text" ? msg.content[0].text : "";
    console.log("[Writing Grade] AI response:", raw);

    const grading = parseWritingGradingJson(raw);

    if (!grading) {
      console.error("[Writing Grade] Failed to parse AI response:", raw);
      return NextResponse.json({ ok: false, error: "AI response parse error" }, { status: 500 });
    }

    console.log("[Writing Grade] Parsed grading:", grading);

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
      console.error("[Writing Grade] DB update error:", updateErr);
      return NextResponse.json({ ok: false, error: `DB update failed: ${updateErr.message}` }, { status: 500 });
    }

    console.log("[Writing Grade] DB update success");

    console.log("[Writing Grade] Success");
    return NextResponse.json({ ok: true, grading });
  } catch (err) {
    console.error("[Writing Grade] Error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: `AI grading failed: ${msg}` }, { status: 500 });
  }
}
