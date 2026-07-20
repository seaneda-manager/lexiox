import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'placeholder' });

export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { resultId } = await req.json();
    if (!resultId) return NextResponse.json({ error: "resultId required" }, { status: 400 });

    const { data: result, error } = await supabase
      .from("speaking_results_2026")
      .select("id, script, prompt, content_score, fluency_score, language_score, pronunciation_score, user_id")
      .eq("id", resultId)
      .maybeSingle();

    if (error || !result) return NextResponse.json({ error: "Result not found" }, { status: 404 });
    if (result.user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const script = result.script?.trim();
    if (!script) return NextResponse.json({ error: "No script to analyze" }, { status: 400 });

    const prompt = `You are an expert TOEFL Speaking tutor providing detailed feedback to a Korean student.

## Task Prompt
${result.prompt ?? "(No prompt provided)"}

## Student's Response Script
${script}

## Scores
- Content: ${result.content_score ?? "N/A"}
- Fluency: ${result.fluency_score ?? "N/A"}
- Language: ${result.language_score ?? "N/A"}
- Pronunciation: ${result.pronunciation_score ?? "N/A"}

Please provide structured feedback in Korean with the following sections:

### 1. 전체 평가 (Overall Assessment)
Brief 2-3 sentence overall evaluation.

### 2. Topic Sentence 분석
Evaluate the opening topic sentence. Is it clear and direct? Provide an improved version if needed.

### 3. 이유 & 근거 (Reasons & Details)
Analyze the reasons and supporting details. Are they specific and well-developed?

### 4. 문법 & 표현 오류 (Grammar & Expression Errors)
List specific grammar mistakes with corrections. Format each as:
- 오류: [wrong] → 수정: [correct] (설명)

### 5. 어휘 & 표현 개선 (Vocabulary & Expression Improvements)
Suggest better vocabulary or idiomatic expressions for key phrases.

### 6. 구조 & 시간 활용 (Structure & Time Management)
Comment on response structure and completeness within time limits.

### 7. 핵심 개선 포인트 (Key Improvement Points)
3 most important things to focus on for the next attempt.

Be specific, encouraging, and practical. Use Korean for explanations but keep English corrections in English.`;

    const message = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2048,
      thinking: { type: "adaptive" },
      messages: [{ role: "user", content: prompt }],
    });

    const feedbackText = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("\n");

    // Store feedback in meta field
    await supabase
      .from("speaking_results_2026")
      .update({ meta: { ai_feedback: feedbackText, ai_feedback_at: new Date().toISOString() } })
      .eq("id", resultId);

    return NextResponse.json({ feedback: feedbackText });
  } catch (err) {
    console.error("ai-feedback error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
