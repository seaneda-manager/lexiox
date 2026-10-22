export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePromoOrg } from "@/lib/promo/context";
import { getServiceSupabase } from "@/lib/supabase/service";
import { publishPost } from "@/lib/promo/publish";
import type { Channel, Post } from "@/lib/promo/types";

const Body = z.object({ postId: z.string().uuid() });

// 승인된 게시물을 예약 시간과 상관없이 지금 업로드 (실패 건 재시도 포함)
export async function POST(req: Request) {
  try {
    const ctx = await requirePromoOrg();
    const { postId } = Body.parse(await req.json());
    // 사용자 세션으로 먼저 읽어 이 가맹점 게시물인지 RLS로 확인
    const { data: post } = await ctx.supabase.from("promo_posts").select("*").eq("id", postId).eq("org_id", ctx.org.id).maybeSingle();
    if (!post) return NextResponse.json({ ok: false, error: "게시물을 찾을 수 없어요." }, { status: 404 });
    if (post.status === "pending") return NextResponse.json({ ok: false, error: "먼저 컨펌(승인)해주세요." }, { status: 400 });
    const { data: ch } = await ctx.supabase.from("promo_channels").select("*").eq("id", post.channel_id).maybeSingle();
    if (!ch) return NextResponse.json({ ok: false, error: "채널을 찾을 수 없어요." }, { status: 404 });

    const svc = getServiceSupabase();
    await svc.from("promo_posts").update({ publish_attempts: 0 }).eq("id", postId);
    const r = await publishPost(svc, { ...(post as Post), status: post.status === "failed" ? "failed" : "scheduled" }, ch as Channel);
    return NextResponse.json(r.ok ? { ok: true } : { ok: false, error: r.error }, { status: r.ok ? 200 : 502 });
  } catch (e) {
    console.error("[promo/publish-now]", e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "알 수 없는 오류" }, { status: 500 });
  }
}
