// app/api/speaking-2026/review/route.ts
// 학생용 Speaking 상세 리뷰 조회.
//  - 학생: 선생님이 검수해서 "공개"한 리뷰만 받아 본다. 공개 전이면 공개 예정일을 알려 준다. (학생은 직접 만들 수 없다)
//  - 선생님/관리자: 초안도 미리 볼 수 있다. 만드는 곳은 '리뷰 관리'(/api/staff/reviews/generate).
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

  if (ctx.cached && (!ctx.isOwner || isPublishedBundle(ctx.cached))) {
    return NextResponse.json({
      ok: true,
      bundle: ctx.cached,
      status: ctx.cached.status ?? "published",
      isStaff: !ctx.isOwner,
    });
  }

  if (ctx.isOwner) {
    return NextResponse.json(
      { ok: false, notPublished: true, releaseAt: releaseAtOf(ctx.submittedAt), error: "자세한 리뷰는 곧 공개돼요." },
      { status: 409 },
    );
  }
  return NextResponse.json(
    { ok: false, notGenerated: true, isStaff: true, error: "아직 만들지 않았어요. 선생님 메뉴의 ‘리뷰 관리’에서 만들어 주세요." },
    { status: 409 },
  );
}
