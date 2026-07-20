// app/api/speaking-2026/shadowing/score/route.ts
// 쉐도잉 게임 채점 — transcript는 클라이언트가 보내지만, 목표 문장은 서버가 DB에서 직접 조회(위조 방지)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSupabase } from "@/lib/supabase/server";
import { loadShadowingStage } from "@/lib/speaking-2026/shadowingStage";
import { scoreShadowingAttempt, TIER_BONUS } from "@/lib/speaking-2026/shadowingScore";
import { awardPoints } from "@/lib/gamification/awardPoints";

export const dynamic = "force-dynamic";

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !service) return null;
  return createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    let body: { stageId?: string; sentenceId?: string; transcript?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
    }

    const { stageId, sentenceId, transcript } = body;
    if (!stageId || !sentenceId) {
      return NextResponse.json({ ok: false, error: "stageId/sentenceId required" }, { status: 400 });
    }

    const service = getServiceSupabase();
    if (!service) {
      return NextResponse.json({ ok: false, error: "Server misconfigured" }, { status: 500 });
    }

    const stage = await loadShadowingStage(service, stageId);
    if (!stage) {
      return NextResponse.json({ ok: false, error: "Stage not found." }, { status: 404 });
    }

    const sentence = stage.sentences.find((s) => s.id === sentenceId);
    if (!sentence) {
      return NextResponse.json({ ok: false, error: "Sentence not found." }, { status: 404 });
    }

    const result = scoreShadowingAttempt(sentence.text, transcript ?? "");

    let pointsEarned = 0;
    if (result.tier !== "retry") {
      const awarded = await awardPoints({
        studentId: user.id,
        ruleId: "shadowing_sentence",
        bonus: TIER_BONUS[result.tier],
        sourceRef: stageId,
        metadata: { sentenceId, accuracy: result.accuracy, tier: result.tier },
      });
      pointsEarned = awarded?.pointsEarned ?? 0;
    }

    return NextResponse.json({
      ok: true,
      accuracy: result.accuracy,
      tier: result.tier,
      diff: result.diff,
      pointsEarned,
    });
  } catch (error) {
    console.error("[speaking-2026.shadowing.score] error", error);
    return NextResponse.json({ ok: false, error: "Failed to score attempt." }, { status: 500 });
  }
}
