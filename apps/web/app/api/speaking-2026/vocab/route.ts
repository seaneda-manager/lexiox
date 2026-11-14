// app/api/speaking-2026/vocab/route.ts
// 말하기 단어시험 범위 조회. 선생님이 '리뷰 관리'에서 리뷰와 함께 만들고, 학생은 공개된 뒤에만 열 수 있다.
import { NextResponse } from "next/server";
import { loadSpeakingReviewSession } from "@/lib/speaking/reviewSession";
import { isPublishedBundle } from "@/lib/speaking/reviewTypes";
import { releaseAtOf } from "@/lib/reviewRelease";

export const dynamic = "force-dynamic";

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

  if (ctx.isOwner && !isPublishedBundle(ctx.cached)) {
    return NextResponse.json(
      { ok: false, notPublished: true, releaseAt: releaseAtOf(ctx.submittedAt), error: "자세한 리뷰는 곧 공개돼요." },
      { status: 409 },
    );
  }
  if (ctx.cached?.vocab?.items.length) {
    return NextResponse.json({ ok: true, items: ctx.cached.vocab.items, isStaff: !ctx.isOwner });
  }
  return NextResponse.json(
    { ok: false, notGenerated: true, isStaff: !ctx.isOwner, error: "단어시험이 아직 만들어지지 않았어요. 선생님 메뉴의 ‘리뷰 관리’에서 만들어 주세요." },
    { status: 409 },
  );
}
