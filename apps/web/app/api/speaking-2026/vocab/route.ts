// app/api/speaking-2026/vocab/route.ts
// 말하기 단어시험 범위 — 이 스피킹 주제(모범답안·학생 답변)에서 뽑은 단어/이어동사/숙어. 캐시 우선.
import { NextResponse } from "next/server";
import { generateSpeakingReview, generateSpeakingVocab } from "@/lib/speaking/aiReview";
import { loadSpeakingReviewSession, saveSpeakingBundle } from "@/lib/speaking/reviewSession";
import type { SpeakingReviewBundle } from "@/lib/speaking/reviewTypes";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  let body: { resultId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const loaded = await loadSpeakingReviewSession(body.resultId ?? "");
  if (loaded.ok === false) return NextResponse.json({ ok: false, error: loaded.error }, { status: loaded.status });
  const { ctx } = loaded;

  if (ctx.cached?.vocab?.items.length) {
    return NextResponse.json({ ok: true, items: ctx.cached.vocab.items });
  }
  // 선생님/관리자가 열었는데 아직 만들어진 게 없으면 만들지 않는다 (비용 보호). 학생이 열 때 한 번만 만들어 저장한다.
  if (!ctx.isOwner) {
    return NextResponse.json({ ok: false, notGenerated: true, error: "아직 만들어진 리뷰가 없어요. 학생이 리뷰를 처음 열면 자동으로 만들어집니다." }, { status: 409 });
  }
  if (!ctx.script.trim()) {
    return NextResponse.json({ ok: false, error: "스크립트가 없어 단어시험을 만들 수 없습니다. 재발화로 스크립트를 먼저 저장해 주세요." }, { status: 422 });
  }

  try {
    let bundle: SpeakingReviewBundle | null = ctx.cached;
    if (!bundle) {
      const { delivery, review, model } = await generateSpeakingReview({ prompt: ctx.prompt, script: ctx.script, durationSec: ctx.durationSec });
      bundle = { version: 1, model, generatedAt: new Date().toISOString(), delivery, review };
    }
    const items = await generateSpeakingVocab({ review: bundle.review, script: ctx.script, prompt: ctx.prompt });
    await saveSpeakingBundle(ctx, { ...bundle, vocab: { generatedAt: new Date().toISOString(), items } });
    return NextResponse.json({ ok: true, items });
  } catch (e) {
    console.error("[Speaking Vocab] error:", e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "단어시험 생성 실패" }, { status: 500 });
  }
}
