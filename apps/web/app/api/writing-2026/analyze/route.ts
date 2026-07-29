// app/api/writing-2026/analyze/route.ts
// AI Writing Analysis - Error classification, pattern detection, exemplar generation

import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { analyzeWritingSections } from "@/lib/writing/analyzer";
import type { WritingAnalysisResult } from "@/lib/writing/analyzer";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const getAI = () => new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  let body: {
    buildASentenceAnswer?: string;
    emailAnswer?: string;
    discussionAnswer?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { buildASentenceAnswer, emailAnswer, discussionAnswer } = body;

  if (!emailAnswer && !discussionAnswer) {
    return NextResponse.json({ ok: false, error: "At least one answer required" }, { status: 400 });
  }

  try {
    // Use analyzer to get structured error data
    const analysis = await analyzeWritingSections(
      buildASentenceAnswer || null,
      emailAnswer || null,
      discussionAnswer || null
    );

    // TODO: Implement actual AI analysis with Claude API
    // For now, return placeholder analysis structure

    return NextResponse.json({ ok: true, analysis });
  } catch (err) {
    console.error("[Writing Analysis] Error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: `Analysis failed: ${msg}` }, { status: 500 });
  }
}
