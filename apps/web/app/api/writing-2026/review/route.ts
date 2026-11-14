// app/api/writing-2026/review/route.ts
// 학생용 AI 리뷰 — 캐시가 있으면 반환, 없으면 생성 후 저장. (소유자 또는 선생님/관리자)
import { NextResponse } from "next/server";
import { generateWritingReview } from "@/lib/writing/aiReview";
import { loadReviewSession, saveReview } from "@/lib/writing/reviewSession";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  let body: { sessionId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const loaded = await loadReviewSession(body.sessionId ?? "");
  if (loaded.ok === false) return NextResponse.json({ ok: false, error: loaded.error }, { status: loaded.status });
  const { ctx } = loaded;

  if (ctx.cached && (ctx.cached.email || ctx.cached.discussion)) {
    return NextResponse.json({ ok: true, cached: true, review: ctx.cached });
  }

  // 선생님/관리자가 열었는데 아직 만들어진 게 없으면 만들지 않는다 (비용 보호). 학생이 열 때 한 번만 만들어 저장한다.
  if (!ctx.isOwner) {
    return NextResponse.json({ ok: false, notGenerated: true, error: "아직 만들어진 리뷰가 없어요. 학생이 리뷰를 처음 열면 자동으로 만들어집니다." }, { status: 409 });
  }

  try {
    const review = await generateWritingReview(ctx.input);
    const saved = await saveReview(ctx.sessionId, review);
    return NextResponse.json({ ok: true, cached: false, saved, review });
  } catch (e) {
    console.error("[Writing Review] error:", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "리뷰 생성 실패" },
      { status: 500 },
    );
  }
}
