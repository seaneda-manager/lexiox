// app/api/speaking-2026/drill/route.ts
// 녹음 Drill 문항 조회 + 채점. 문항은 선생님이 '리뷰 관리'에서 리뷰와 함께 만들고, 학생은 공개된 뒤에만 열 수 있다.
//  action: "get"(기본) → 문항 반환,  "check" → pattern 문항 1개 채점(인식된 문장 기준)
import { NextResponse } from "next/server";
import { checkFixAnswer, checkSpokenAnswer, computeDelivery } from "@/lib/speaking/aiReview";
import { loadSpeakingReviewSession } from "@/lib/speaking/reviewSession";
import { isPublishedBundle, type SpeakingReviewBundle } from "@/lib/speaking/reviewTypes";
import { releaseAtOf } from "@/lib/reviewRelease";
import { buildDrillAttempt } from "@/lib/reviewAttempts";
import { appendSpeakingAttempt } from "@/lib/reviewAttempts.server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  let body: {
    resultId?: string;
    action?: "get" | "check" | "compare" | "fix" | "finish";
    results?: { tag?: string; ok?: boolean }[];
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

  // 공개 전에는 학생이 Drill 을 열 수 없다 (선생님은 미리보기 가능)
  if (ctx.isOwner && !isPublishedBundle(ctx.cached)) {
    return NextResponse.json(
      { ok: false, notPublished: true, releaseAt: releaseAtOf(ctx.submittedAt), error: "자세한 리뷰는 곧 공개돼요." },
      { status: 409 },
    );
  }

  try {
    // 마칠 때 결과 저장 (학생 본인의 공개된 리뷰에서만)
    if (body.action === "finish") {
      if (!ctx.isOwner) return NextResponse.json({ ok: true, skipped: true });
      const attempt = buildDrillAttempt(body.results ?? []);
      if (!attempt) return NextResponse.json({ ok: false, error: "저장할 결과가 없습니다" }, { status: 400 });
      const saved = await appendSpeakingAttempt(ctx.resultId, attempt);
      return NextResponse.json({ ok: saved, attempt: saved ? attempt : undefined });
    }

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

    if (ctx.cached?.drill?.items.length) {
      return NextResponse.json({ ok: true, items: ctx.cached.drill.items, retell: retellInfo(ctx.cached), isStaff: !ctx.isOwner });
    }
    return NextResponse.json(
      { ok: false, notGenerated: true, isStaff: !ctx.isOwner, error: "Drill 이 아직 만들어지지 않았어요. 선생님 메뉴의 ‘리뷰 관리’에서 만들어 주세요." },
      { status: 409 },
    );
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
