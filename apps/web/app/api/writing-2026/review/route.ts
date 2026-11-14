// app/api/writing-2026/review/route.ts
// 학생용 AI 리뷰 — 캐시가 있으면 반환, 없으면 생성 후 저장. (소유자 또는 선생님/관리자)
import { NextResponse } from "next/server";
import { generateWritingReview } from "@/lib/writing/aiReview";
import { loadReviewSession, saveReview } from "@/lib/writing/reviewSession";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  let body: { sessionId?: string; regenerate?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const loaded = await loadReviewSession(body.sessionId ?? "");
  if (loaded.ok === false) return NextResponse.json({ ok: false, error: loaded.error }, { status: loaded.status });
  const { ctx } = loaded;

  if (ctx.cached && !body.regenerate && (ctx.cached.email || ctx.cached.discussion)) {
    return NextResponse.json({ ok: true, cached: true, review: ctx.cached });
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
