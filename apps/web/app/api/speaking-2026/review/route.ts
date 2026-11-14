// app/api/speaking-2026/review/route.ts
// Speaking 상세 리뷰 — 캐시가 있으면 반환, 없으면 생성 후 저장. (소유자 또는 선생님/관리자)
import { NextResponse } from "next/server";
import { generateSpeakingReview } from "@/lib/speaking/aiReview";
import { loadSpeakingReviewSession, saveSpeakingBundle } from "@/lib/speaking/reviewSession";
import type { SpeakingReviewBundle } from "@/lib/speaking/reviewTypes";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  let body: { resultId?: string; regenerate?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const loaded = await loadSpeakingReviewSession(body.resultId ?? "");
  if (loaded.ok === false) return NextResponse.json({ ok: false, error: loaded.error }, { status: loaded.status });
  const { ctx } = loaded;

  if (ctx.cached && !body.regenerate) {
    return NextResponse.json({ ok: true, cached: true, bundle: ctx.cached });
  }
  if (!ctx.script.trim()) {
    return NextResponse.json({ ok: false, error: "스크립트가 없어 리뷰를 만들 수 없습니다. 재발화로 스크립트를 먼저 저장해 주세요." }, { status: 422 });
  }

  try {
    const { delivery, review, model } = await generateSpeakingReview({
      prompt: ctx.prompt,
      script: ctx.script,
      durationSec: ctx.durationSec,
    });
    const bundle: SpeakingReviewBundle = { version: 1, model, generatedAt: new Date().toISOString(), delivery, review };
    const saved = await saveSpeakingBundle(ctx, bundle);
    return NextResponse.json({ ok: true, cached: false, saved, bundle });
  } catch (e) {
    console.error("[Speaking Review] error:", e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "리뷰 생성 실패" }, { status: 500 });
  }
}
