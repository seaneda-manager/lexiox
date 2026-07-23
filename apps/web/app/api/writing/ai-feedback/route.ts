import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getServerSupabase } from "@/lib/supabase/server";
import type { WWritingTest2026 } from "@/models/writing";
import { TASK1_RUBRIC, TASK2_RUBRIC, TASK3_RUBRIC, calculateTotalScore } from "@/lib/writing/scoring-rubric";

export const runtime = "nodejs";
export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'placeholder' });

export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { sessionId } = await req.json();
    if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

    const { data: session, error } = await supabase
      .from("writing_2026_sessions")
      .select("id, user_id, test_id, raw_answers")
      .eq("id", sessionId)
      .maybeSingle();

    if (error || !session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    if (session.user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const answers = session.raw_answers as Record<string, string>;
    const allText = Object.entries(answers)
      .map(([k, v]) => `[${k}]\n${v}`)
      .join("\n\n");

    if (!allText.trim()) return NextResponse.json({ error: "No answers to analyze" }, { status: 400 });

    // 테스트 구조 가져오기 (있으면 프롬프트 컨텍스트에 포함)
    let testContext = "";
    const { data: testRow } = await supabase
      .from("writing_tests")
      .select("label, payload")
      .eq("id", session.test_id)
      .maybeSingle();

    if (testRow?.payload) {
      const test = testRow.payload as WWritingTest2026;
      testContext = `## Test: ${testRow.label ?? session.test_id}\n` +
        test.items.map((item) => {
          if (item.taskKind === "email") {
            return `Task [${item.id}] Email Writing\nSituation: ${item.situation}\nPrompt: ${item.prompt}`;
          }
          if (item.taskKind === "academic_discussion") {
            return `Task [${item.id}] Academic Discussion\nContext: ${item.context}\nProfessor: ${item.professorPrompt}`;
          }
          if (item.taskKind === "micro_writing") {
            return `Task [${item.id}] Micro Writing\n` + item.prompts.map((p) => `  [${item.id}::${p.id}] ${p.prompt}`).join("\n");
          }
          return `Task [${item.id}] ${item.taskKind}`;
        }).join("\n\n");
    }

    const prompt = `You are an expert TOEFL Writing tutor providing detailed feedback and scoring to a Korean student.

${testContext}

## Student's Answers
${allText}

## Rubric & Scoring Guidelines

### Task 1: Build a Sentence (Max 10 points)
- Each of 10 items is 1 point (correct/incorrect)
- Score out of 10

### Task 2: Email Writing (Max 30 points)
Criteria:
- Word Count (0-5 pts): 100-120 words = 5pts, 80-99 or 121-150 = 3pts, <79 or >150 = 1pt
- Format & Structure (0-10 pts): Perfect format = 10, mostly correct = 7, basic but lacking = 4, inappropriate = 1
- Content & Coherence (0-10 pts): Reflects situation perfectly = 10, mostly matches = 7, basic with inconsistency = 4, inappropriate = 1
- Grammar & Expression (0-5 pts): No errors = 5, 2-3 minor errors = 3, multiple errors = 1

### Task 3: Academic Discussion (Max 30 points)
Criteria:
- Word Count (0-5 pts): 120+ = 5, 100-119 = 3, <100 = 1
- Thesis Clarity (0-10 pts): Clear & strong = 10, mostly clear = 7, unclear = 4, absent = 1
- Evidence & Development (0-10 pts): 2+ strong evidences = 10, has evidence = 7, lacks evidence = 4, none = 1
- Grammar & Expression (0-5 pts): No errors, academic = 5, 2-3 minor errors = 3, multiple errors = 1

## Output Format

Please provide feedback in Korean with the following JSON-compatible structure:

### SCORES (JSON)
{
  "task1_score": <number 0-10>,
  "task2_score": <number 0-30>,
  "task3_score": <number 0-30>,
  "total_score": <auto-calculated>
}

### 1. 전체 평가 (Overall Assessment)
전반적인 Writing 수준과 강점/약점을 2-3문장으로 평가하세요.

### 2. Email Writing 피드백 (Task 2)
- 단어 수: [count] 단어 → [점수] 점
- 형식 & 구조: [피드백] → [점수] 점
- 내용 & 일관성: [피드백] → [점수] 점
- 문법 & 표현: [피드백] → [점수] 점

### 3. Academic Discussion 피드백 (Task 3)
- 단어 수: [count] 단어 → [점수] 점
- 논점 명확성: [피드백] → [점수] 점
- 근거 & 발전: [피드백] → [점수] 점
- 문법 & 표현: [피드백] → [점수] 점

### 4. 문법 & 표현 오류 (Grammar & Expression Errors)
주요 문법 오류를 나열하세요:
- 오류: [wrong] → 수정: [correct] (설명)

### 5. 어휘 & 표현 개선 (Vocabulary & Expression Improvements)
더 자연스럽거나 학술적인 표현으로 개선할 부분을 제안하세요.

### 6. 핵심 개선 포인트 (Key Improvement Points)
다음 번 Writing을 위한 3가지 핵심 개선 사항을 구체적으로 제시하세요.

Be specific, encouraging, and practical. Keep English examples in English.`;

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

    // 점수 파싱
    let scores = { task1_score: 0, task2_score: 0, task3_score: 0, total_score: 0 };
    const jsonMatch = feedbackText.match(/\{[\s\S]*?"task1_score"[\s\S]*?\}/);
    if (jsonMatch) {
      try {
        scores = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.warn("Failed to parse scores from feedback");
      }
    }

    await supabase
      .from("writing_2026_sessions")
      .update({
        meta: {
          ai_feedback: feedbackText,
          ai_feedback_at: new Date().toISOString(),
          scores: {
            task1: scores.task1_score,
            task2: scores.task2_score,
            task3: scores.task3_score,
            total: scores.total_score,
          },
        },
      })
      .eq("id", sessionId);

    return NextResponse.json({
      feedback: feedbackText,
      scores: {
        task1: scores.task1_score,
        task2: scores.task2_score,
        task3: scores.task3_score,
        total: scores.total_score,
      },
    });
  } catch (err) {
    console.error("writing ai-feedback error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
