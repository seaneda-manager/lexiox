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

    const { mode, content } = await req.json();
    // mode: "translate" | "background"
    // content: string (passage HTML stripped, or question+answer text)

    if (!mode || !content) return NextResponse.json({ error: "mode and content required" }, { status: 400 });

    let prompt = "";
    if (mode === "translate") {
      prompt = `다음 영어 지문을 한국어로 자연스럽게 번역해주세요. 학술적 문체를 유지하고, 단락 구분을 그대로 유지하세요.\n\n${content}`;
    } else if (mode === "background") {
      prompt = `다음 TOEFL Reading 문제와 지문 내용에 대해 한국 학생이 이해하기 쉽도록 배경지식을 설명해주세요. 주제 관련 핵심 개념, 역사적 맥락, 과학적 원리 등을 간결하게 (3-5개 bullet point) 설명해주세요.\n\n${content}`;
    } else {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    }

    const message = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1500,
      thinking: { type: "adaptive" },
      messages: [{ role: "user", content: prompt }],
    });

    const result = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("\n");

    return NextResponse.json({ result });
  } catch (err) {
    console.error("reading ai-explain error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
