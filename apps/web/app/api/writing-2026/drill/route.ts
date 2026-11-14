// app/api/writing-2026/drill/route.ts
// 리뷰(수정된 문장·문법 경향)에서 Drill 문항을 만든다. 캐시 우선.
//  action: "get"(기본) → 문항 반환/생성,  "check" → 작문 문항 1개 채점
import { NextResponse } from "next/server";
import { checkComposeAnswer, generateWritingDrill, generateWritingReview } from "@/lib/writing/aiReview";
import { loadReviewSession, saveReview } from "@/lib/writing/reviewSession";
import type { WritingAiReview } from "@/lib/writing/reviewTypes";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  let body: { sessionId?: string; action?: "get" | "check"; itemId?: string; answer?: string; item?: { korean?: string; answer?: string; mustUse?: string } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const loaded = await loadReviewSession(body.sessionId ?? "");
  if (loaded.ok === false) return NextResponse.json({ ok: false, error: loaded.error }, { status: loaded.status });
  const { ctx } = loaded;

  try {
    if (body.action === "check") {
      // 캐시(ai_review 컬럼)가 없는 환경에서도 동작하도록 클라이언트가 보낸 문항을 대체값으로 쓴다.
      const cachedItem = ctx.cached?.drill?.items.find((i) => i.id === body.itemId);
      const item =
        cachedItem && cachedItem.kind === "compose"
          ? cachedItem
          : body.item && typeof body.item.korean === "string" && typeof body.item.answer === "string"
            ? { korean: body.item.korean, answer: body.item.answer, mustUse: String(body.item.mustUse ?? "") }
            : null;
      if (!item) {
        return NextResponse.json({ ok: false, error: "문항을 찾을 수 없습니다" }, { status: 404 });
      }
      const answer = (body.answer ?? "").trim();
      if (!answer) return NextResponse.json({ ok: false, error: "답을 입력하세요" }, { status: 400 });
      const result = await checkComposeAnswer({
        korean: item.korean,
        modelAnswer: item.answer,
        mustUse: item.mustUse,
        studentAnswer: answer.slice(0, 600),
      });
      return NextResponse.json({ ok: true, result, modelAnswer: item.answer });
    }

    if (ctx.cached?.drill?.items.length) {
      return NextResponse.json({ ok: true, items: ctx.cached.drill.items });
    }

  // 선생님/관리자가 열었는데 아직 만들어진 게 없으면 만들지 않는다 (비용 보호). 학생이 열 때 한 번만 만들어 저장한다.
  if (!ctx.isOwner) {
    return NextResponse.json({ ok: false, notGenerated: true, error: "아직 만들어진 리뷰가 없어요. 학생이 리뷰를 처음 열면 자동으로 만들어집니다." }, { status: 409 });
  }

    // 리뷰가 아직 없으면(리뷰 페이지를 거치지 않고 접근) 먼저 만든다.
    let review: WritingAiReview | null = ctx.cached;
    if (!review || (!review.email && !review.discussion)) {
      review = await generateWritingReview(ctx.input);
    }
    const items = await generateWritingDrill(review);
    const withDrill: WritingAiReview = { ...review, drill: { generatedAt: new Date().toISOString(), items } };
    await saveReview(ctx.sessionId, withDrill);
    return NextResponse.json({ ok: true, items });
  } catch (e) {
    console.error("[Writing Drill] error:", e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Drill 처리 실패" }, { status: 500 });
  }
}
