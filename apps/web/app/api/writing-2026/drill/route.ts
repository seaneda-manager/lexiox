// app/api/writing-2026/drill/route.ts
// Writing Drill 문항 조회 + 작문 채점.
//  - Drill 문항은 선생님이 '리뷰 관리'에서 리뷰와 함께 만든다. 학생은 공개된 뒤에만 열 수 있다.
//  action: "get"(기본) → 문항 반환,  "check" → 작문 문항 1개 채점
import { NextResponse } from "next/server";
import { checkComposeAnswer } from "@/lib/writing/aiReview";
import { loadReviewSession } from "@/lib/writing/reviewSession";
import { isPublishedReview } from "@/lib/writing/reviewTypes";
import { releaseAtOf } from "@/lib/reviewRelease";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

  // 공개 전에는 학생이 Drill 을 열 수 없다 (선생님은 미리보기 가능)
  if (ctx.isOwner && !isPublishedReview(ctx.cached)) {
    return NextResponse.json(
      { ok: false, notPublished: true, releaseAt: releaseAtOf(ctx.submittedAt), error: "자세한 리뷰는 곧 공개돼요." },
      { status: 409 },
    );
  }

  try {
    if (body.action === "check") {
      const cachedItem = ctx.cached?.drill?.items.find((i) => i.id === body.itemId);
      const item =
        cachedItem && cachedItem.kind === "compose"
          ? cachedItem
          : body.item && typeof body.item.korean === "string" && typeof body.item.answer === "string"
            ? { korean: body.item.korean, answer: body.item.answer, mustUse: String(body.item.mustUse ?? "") }
            : null;
      if (!item) return NextResponse.json({ ok: false, error: "문항을 찾을 수 없습니다" }, { status: 404 });
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
      return NextResponse.json({ ok: true, items: ctx.cached.drill.items, isStaff: !ctx.isOwner, status: ctx.cached.status ?? "published" });
    }
    return NextResponse.json(
      { ok: false, notGenerated: true, isStaff: !ctx.isOwner, error: "Drill 이 아직 만들어지지 않았어요. 선생님 메뉴의 ‘리뷰 관리’에서 만들어 주세요." },
      { status: 409 },
    );
  } catch (e) {
    console.error("[Writing Drill] error:", e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Drill 처리 실패" }, { status: 500 });
  }
}
