// apps/web/app/api/speaking-voca-drill-results/route.ts
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

type SaveSpeakingVocaDrillPayload = {
  prompt: string;
  script: string;
  mustUseWords: string[];
  mode?: string | null;
  meta?: any;
};

export async function POST(req: Request) {
  const supabase = await getServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let payload: SaveSpeakingVocaDrillPayload;

  try {
    payload = (await req.json()) as SaveSpeakingVocaDrillPayload;
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const {
    prompt,
    script,
    mustUseWords,
    mode = "task1_voca_drill",
    meta = null,
  } = payload;

  if (!prompt || !script || !Array.isArray(mustUseWords)) {
    return NextResponse.json(
      { ok: false, error: "prompt, script, mustUseWords are required" },
      { status: 400 },
    );
  }

  // 대략적인 문장 수 계산 ( ., ?, ! 기준)
  const approxSentences = script
    .split(/[.!?]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0).length;

  const { error } = await supabase.from("speaking_voca_drill_results").insert({
    user_id: user?.id ?? null,
    mode,
    prompt,
    script,
    must_use_words: mustUseWords,
    approx_sentences: approxSentences,
    meta,
  });

  if (error) {
    console.error("Failed to insert speaking_voca_drill_results", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
