// app/api/speaking-2026/drill/route.ts
// 녹음 Drill 문항 생성(캐시 우선) + 단문 말하기 채점.
//  action: "get"(기본) → 문항 반환/생성,  "check" → pattern 문항 1개 채점(인식된 문장 기준)
import { NextResponse } from "next/server";
import { checkFixAnswer, checkSpokenAnswer, computeDelivery, generateSpeakingDrill, generateSpeakingReview } from "@/lib/speaking/aiReview";
import { loadSpeakingReviewSession, saveSpeakingBundle } from "@/lib/speaking/reviewSession";
import type { SpeakingReviewBundle } from "@/lib/speaking/reviewTypes";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  let body: {
    resultId?: string;
    action?: "get" | "check" | "compare" | "fix";
    regenerate?: boolean;
    transcript?: string;
    durationSec?: number;
    item?: { korean?: string; answer?: string; mustUse?: string; wrong?: string };
    typed?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const loaded = await loadSpeakingReviewSession(body.resultId ?? "");
  if (loaded.ok === false) return NextResponse.json({ ok: false, error: loaded.error }, { status: loaded.status });
  const { ctx } = loaded;

  try {
    if (body.action === "check") {
      const it = body.item;
      const transcript = (body.transcript ?? "").trim();
      if (!it?.korean || !it?.answer) return NextResponse.json({ ok: false, error: "문항 정보가 없습니다" }, { status: 400 });
      if (!transcript) return NextResponse.json({ ok: false, error: "인식된 말이 없습니다. 다시 녹음해 주세요." }, { status: 400 });
      const result = await checkSpokenAnswer({
        korean: it.korean,
        modelAnswer: it.answer,
        mustUse: it.mustUse ?? "",
        transcript: transcript.slice(0, 600),
      });
      return NextResponse.json({ ok: true, result });
    }

    if (body.action === "fix") {
      const it = body.item;
      const typed = (body.typed ?? "").trim();
      if (!it?.wrong || !it?.answer) return NextResponse.json({ ok: false, error: "문항 정보가 없습니다" }, { status: 400 });
      if (!typed) return NextResponse.json({ ok: false, error: "고친 문장을 입력하세요" }, { status: 400 });
      const result = await checkFixAnswer({ wrong: it.wrong, modelAnswer: it.answer, studentFix: typed.slice(0, 400) });
      return NextResponse.json({ ok: true, result });
    }

    // 전체 재녹음 비교용 수치 (처음 답 vs 다시 한 답)
    if (body.action === "compare") {
      const transcript = (body.transcript ?? "").trim();
      const dur = Number(body.durationSec);
      return NextResponse.json({
        ok: true,
        before: computeDelivery(ctx.script, ctx.durationSec),
        after: computeDelivery(transcript, Number.isFinite(dur) && dur > 0 ? dur : null),
      });
    }

    if (ctx.cached?.drill?.items.length && !body.regenerate) {
      return NextResponse.json({ ok: true, items: ctx.cached.drill.items, retell: retellInfo(ctx.cached) });
    }

    let bundle: SpeakingReviewBundle | null = ctx.cached;
    if (!bundle) {
      if (!ctx.script.trim()) {
        return NextResponse.json({ ok: false, error: "스크립트가 없어 Drill을 만들 수 없습니다." }, { status: 422 });
      }
      const { delivery, review, model } = await generateSpeakingReview({ prompt: ctx.prompt, script: ctx.script, durationSec: ctx.durationSec });
      bundle = { version: 1, model, generatedAt: new Date().toISOString(), delivery, review };
    }
    const items = await generateSpeakingDrill(bundle.review, ctx.prompt, ctx.script);
    const withDrill: SpeakingReviewBundle = { ...bundle, drill: { generatedAt: new Date().toISOString(), items } };
    await saveSpeakingBundle(ctx, withDrill);
    return NextResponse.json({ ok: true, items, retell: retellInfo(withDrill) });
  } catch (e) {
    console.error("[Speaking Drill] error:", e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Drill 처리 실패" }, { status: 500 });
  }
}

/** 마지막 단계(같은 문제 다시 답하기)에 보여 줄 문제·구조 템플릿 */
function retellInfo(b: SpeakingReviewBundle) {
  return {
    outline: b.review.facelift.outline,
    modelText: b.review.facelift.text,
  };
}
