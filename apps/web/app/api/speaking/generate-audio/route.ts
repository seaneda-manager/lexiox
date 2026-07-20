// POST /api/speaking/generate-audio
// 텍스트 → 음성 생성 (ElevenLabs)

import { NextRequest, NextResponse } from "next/server";
import { generateSpeech } from "@/lib/elevenlabs/generate-speech";

export async function POST(req: NextRequest) {
  try {
    const { text, voiceId, voiceIndex, modelId, stability, similarityBoost } =
      await req.json();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { error: "text is required and must be non-empty" },
        { status: 400 }
      );
    }

    if (text.length > 500) {
      return NextResponse.json(
        { error: "text must be 500 characters or less" },
        { status: 400 }
      );
    }

    const result = await generateSpeech(text, {
      voiceId,
      voiceIndex,
      modelId,
      stability,
      similarityBoost,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Speech generation error:", error);

    const message =
      error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
