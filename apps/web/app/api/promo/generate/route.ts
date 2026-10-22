export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePromoOrg } from "@/lib/promo/context";
import { generatePost, PromoLimitError, useAiQuota } from "@/lib/promo/ai";
import { CHANNEL_KINDS, CHANNEL_KIND_LIST, type ChannelKind } from "@/lib/promo/constants";
import { loadOrgBundle } from "@/lib/promo/data";
import { todayKST } from "@/lib/promo/dates";
import {
  brandBlock,
  channelGuide,
  CONTENT_RULES,
  JSON_POST_SHAPE,
  learningBlock,
  profileBlock,
  seasonLine,
} from "@/lib/promo/prompts";

const Body = z.object({
  channelId: z.string().uuid().optional(),
  kind: z.enum(CHANNEL_KIND_LIST as [ChannelKind, ...ChannelKind[]]).optional(),
  purpose: z.string().max(100),
  grade: z.string().max(50).optional().default(""),
  tone: z.string().max(50).optional().default(""),
  message: z.string().max(2000).optional().default(""),
  useLearning: z.boolean().optional().default(true),
});

export async function POST(req: Request) {
  try {
    const ctx = await requirePromoOrg();
    const input = Body.parse(await req.json());

    let kind: ChannelKind = input.kind ?? "blog";
    if (input.channelId) {
      const { data: ch } = await ctx.supabase
        .from("promo_channels")
        .select("kind")
        .eq("id", input.channelId)
        .eq("org_id", ctx.org.id)
        .maybeSingle();
      if (ch?.kind) kind = ch.kind as ChannelKind;
    }

    await useAiQuota(ctx.supabase, ctx.org.id, "write");
    const b = await loadOrgBundle(ctx.supabase, ctx.org);
    const today = todayKST();

    const prompt = [
      "아래 학원의 홍보 콘텐츠를 한국어로 작성하라.",
      "[학원 정보]",
      profileBlock(ctx.org.name, b.profile),
      brandBlock(b.guide),
      input.useLearning ? learningBlock(b.snapshot, b.prevSnapshot) : "",
      seasonLine(today),
      `[채널 형식] ${CHANNEL_KINDS[kind].label}: ${channelGuide(kind)}`,
      "[이번 글]",
      `목적: ${input.purpose}`,
      `대상: ${input.grade || "학원 대상 전체"} 학생과 학부모`,
      `말투: ${input.tone || b.profile?.tone || "신뢰감 있게"}`,
      `꼭 넣을 내용: ${input.message || "(없음, 시즌과 학원 강점에 맞게)"}`,
      `오늘 날짜: ${today}`,
      CONTENT_RULES,
      `답은 JSON 하나: ${JSON_POST_SHAPE} 해시태그가 필요 없는 채널이면 빈 배열.`,
    ]
      .filter(Boolean)
      .join("\n");

    const post = await generatePost(prompt, "promo/generate");
    return NextResponse.json({ ok: true, post, kind });
  } catch (e) {
    const status = e instanceof PromoLimitError ? 429 : e instanceof z.ZodError ? 400 : 500;
    const message = e instanceof z.ZodError ? "입력값을 확인해주세요." : e instanceof Error ? e.message : "알 수 없는 오류";
    if (status === 500) console.error("[promo/generate]", e);
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
