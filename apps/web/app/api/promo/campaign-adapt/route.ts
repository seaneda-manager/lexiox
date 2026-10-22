export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePromoOrg } from "@/lib/promo/context";
import { generatePost, PromoLimitError, useAiQuota } from "@/lib/promo/ai";
import { CHANNEL_KINDS, type ChannelKind } from "@/lib/promo/constants";
import { loadOrgBundle } from "@/lib/promo/data";
import { todayKST } from "@/lib/promo/dates";
import {
  brandBlock,
  channelGuide,
  CONTENT_RULES,
  JSON_POST_SHAPE,
  learningBlock,
  profileBlock,
} from "@/lib/promo/prompts";

const Body = z.object({ campaignId: z.string().uuid(), channelId: z.string().uuid(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

// 본사 캠페인을 이 가맹점 정보에 맞춰 게시물로 만들어 캘린더에 저장한다
export async function POST(req: Request) {
  try {
    const ctx = await requirePromoOrg();
    const input = Body.parse(await req.json());

    const [{ data: camp }, { data: ch }] = await Promise.all([
      ctx.supabase.from("promo_campaigns").select("*").eq("id", input.campaignId).maybeSingle(),
      ctx.supabase.from("promo_channels").select("*").eq("id", input.channelId).eq("org_id", ctx.org.id).maybeSingle(),
    ]);
    if (!camp) return NextResponse.json({ ok: false, error: "캠페인을 찾을 수 없어요." }, { status: 404 });
    if (!ch) return NextResponse.json({ ok: false, error: "채널을 찾을 수 없어요." }, { status: 404 });
    const kind = ch.kind as ChannelKind;

    await useAiQuota(ctx.supabase, ctx.org.id, "campaign");
    const b = await loadOrgBundle(ctx.supabase, ctx.org);

    const prompt = [
      "본사가 배포한 캠페인을 아래 가맹점 학원에 맞게 고쳐 써라. 캠페인의 핵심 메시지와 필수 문구는 유지하고, 학원명·지역·반 구성·연락처를 이 학원 것으로 채운다.",
      "[학원 정보]",
      profileBlock(ctx.org.name, b.profile),
      brandBlock(b.guide),
      learningBlock(b.snapshot, b.prevSnapshot),
      "[본사 캠페인]",
      `제목: ${camp.title}`,
      `기간: ${camp.starts_on ?? "?"} ~ ${camp.ends_on ?? "?"}`,
      `요약: ${camp.summary ?? ""}`,
      `지침: ${camp.brief ?? ""}`,
      camp.template_title || camp.template_body ? `본사 템플릿:\n${camp.template_title ?? ""}\n${camp.template_body ?? ""}` : "",
      `[채널 형식] ${CHANNEL_KINDS[kind].label}: ${channelGuide(kind)}`,
      `게시 예정일: ${input.date} (오늘 ${todayKST()})`,
      CONTENT_RULES,
      `답은 JSON 하나: ${JSON_POST_SHAPE}`,
    ]
      .filter(Boolean)
      .join("\n");

    const post = await generatePost(prompt, "promo/campaign-adapt");
    const { data: saved, error } = await ctx.supabase
      .from("promo_posts")
      .insert({
        org_id: ctx.org.id,
        channel_id: ch.id,
        title: post.title,
        body: post.body,
        hashtags: post.hashtags,
        scheduled_on: input.date,
        status: "pending",
        source: "campaign",
        campaign_id: camp.id,
        created_by: ctx.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error("게시물을 저장하지 못했어요: " + error.message);
    return NextResponse.json({ ok: true, id: saved.id });
  } catch (e) {
    const status = e instanceof PromoLimitError ? 429 : e instanceof z.ZodError ? 400 : 500;
    if (status === 500) console.error("[promo/campaign-adapt]", e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "알 수 없는 오류" }, { status });
  }
}
