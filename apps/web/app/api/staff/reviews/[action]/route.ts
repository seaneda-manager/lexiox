// app/api/staff/reviews/[action]/route.ts
// 선생님/관리자용 리뷰 관리 API: generate | publish | edit | delete   (body: { kind, id, ... })
import { NextResponse } from "next/server";
import { assertStaff, deleteDraft, editReview, generateDraft, setPublished, StaffError, type ReviewKind } from "@/lib/staff/reviews";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 초안 한 건 = AI 호출 2~3번 (순차)

export async function POST(req: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  let body: { kind?: ReviewKind; id?: string; publish?: boolean; task?: "email" | "discussion"; overview?: string; improvedText?: string; faceliftText?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const kind = body.kind;
  const id = body.id ?? "";
  if (kind !== "writing" && kind !== "speaking") {
    return NextResponse.json({ ok: false, error: "kind must be writing | speaking" }, { status: 400 });
  }

  try {
    const who = await assertStaff(kind, id);
    switch (action) {
      case "generate": {
        const r = await generateDraft(kind, id);
        return NextResponse.json({ ok: true, ...r });
      }
      case "publish":
        await setPublished(kind, id, body.publish !== false, who.userId);
        return NextResponse.json({ ok: true });
      case "edit":
        await editReview(kind, id, { task: body.task, overview: body.overview, improvedText: body.improvedText, faceliftText: body.faceliftText });
        return NextResponse.json({ ok: true });
      case "delete":
        await deleteDraft(kind, id);
        return NextResponse.json({ ok: true });
      default:
        return NextResponse.json({ ok: false, error: "unknown action" }, { status: 404 });
    }
  } catch (e) {
    if (e instanceof StaffError) return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    console.error("[staff reviews]", action, e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "처리 실패" }, { status: 500 });
  }
}
