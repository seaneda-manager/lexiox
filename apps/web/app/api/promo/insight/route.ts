export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePromoOrg } from "@/lib/promo/context";
import { generateText, PromoLimitError, useAiQuota } from "@/lib/promo/ai";
import { loadOrgBundle } from "@/lib/promo/data";
import { todayKST } from "@/lib/promo/dates";
import { learningBlock, profileBlock, seasonLine } from "@/lib/promo/prompts";
import { computeStats, RANGE_LABEL, type StatsRange } from "@/lib/promo/stats";
import type { Channel, Lead, Post } from "@/lib/promo/types";

const Body = z.object({ range: z.enum(["month", "3m", "all"]) });

export async function POST(req: Request) {
  try {
    const ctx = await requirePromoOrg();
    const { range } = Body.parse(await req.json());
    const db = ctx.supabase;
    const [{ data: leads }, { data: posts }, { data: channels }] = await Promise.all([
      db.from("promo_leads").select("*").eq("org_id", ctx.org.id),
      db.from("promo_posts").select("*").eq("org_id", ctx.org.id),
      db.from("promo_channels").select("*").eq("org_id", ctx.org.id),
    ]);
    const s = computeStats((leads ?? []) as Lead[], (posts ?? []) as Post[], (channels ?? []) as Channel[], range as StatsRange);

    await useAiQuota(db, ctx.org.id, "insight");
    const b = await loadOrgBundle(db, ctx.org);

    const prompt = [
      "아래 학원 정보와 성과 수치를 보고, 원장님이 이번 주에 바로 할 수 있는 일 3가지를 번호 목록으로 제안하라.",
      "각 항목은 2~3문장, 수치 근거를 한 번씩 언급. 데이터가 적으면 그 점을 짧게 말하고 시즌 기준으로 제안하라. 마크다운 기호(**, #)는 쓰지 마라.",
      "[학원]",
      profileBlock(ctx.org.name, b.profile),
      learningBlock(b.snapshot, b.prevSnapshot),
      seasonLine(todayKST()),
      `[홍보 성과 - ${RANGE_LABEL[range as StatsRange]}]`,
      `단계: ${s.funnel.map((f) => `${f.label} ${f.value}`).join(", ")}`,
      `경로별(문의/등록): ${s.sources.map((x) => `${x.name} ${x.leads}/${x.enrolled}`).join(", ") || "없음"}`,
      `채널별 게시 수: ${s.postsByChannel.map((x) => `${x.label} ${x.value}`).join(", ") || "없음"}`,
      `학년별 문의: ${s.byGrade.map((x) => `${x.label} ${x.value}`).join(", ") || "없음"}`,
    ].join("\n");

    const text = await generateText(prompt, "promo/insight");
    return NextResponse.json({ ok: true, text });
  } catch (e) {
    const status = e instanceof PromoLimitError ? 429 : e instanceof z.ZodError ? 400 : 500;
    if (status === 500) console.error("[promo/insight]", e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "알 수 없는 오류" }, { status });
  }
}
