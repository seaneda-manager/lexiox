import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generatePostBatch, useAiQuota } from "./ai";
import type { ChannelKind } from "./constants";
import { CHANNEL_KINDS } from "./constants";
import { addDays, todayKST, weekday } from "./dates";
import { loadOrgBundle } from "./data";
import {
  brandBlock,
  channelGuide,
  CONTENT_RULES,
  learningBlock,
  profileBlock,
  seasonLine,
} from "./prompts";
import type { Automation, Channel, PromoOrg } from "./types";

type Slot = { automationId: string; channelId: string; kind: ChannelKind; date: string; time: string | null; topics: string[] };

const MAX_SLOTS_PER_RUN = 14;

/**
 * 켜져 있는 자동 일정에 맞춰 다음 days일 동안 비어 있는 날짜의 게시물을 만든다.
 * 같은 채널·같은 날짜에 이미 자동 생성 게시물이 있으면 건너뛴다.
 * 가맹점당 AI 호출 1회로 묶어서 만든다.
 */
export async function autogenForOrg(
  db: SupabaseClient,
  org: PromoOrg,
  opts: { days?: number; createdBy?: string | null } = {}
): Promise<{ created: number; skipped: number; message: string }> {
  const days = opts.days ?? 7;
  const start = todayKST();
  const end = addDays(start, days - 1);

  const [{ data: autos }, { data: chans }, { data: existing }, { data: recent }] = await Promise.all([
    db.from("promo_automations").select("*").eq("org_id", org.id).eq("active", true),
    db.from("promo_channels").select("*").eq("org_id", org.id).eq("active", true),
    db
      .from("promo_posts")
      .select("channel_id, scheduled_on")
      .eq("org_id", org.id)
      .eq("source", "auto")
      .gte("scheduled_on", start)
      .lte("scheduled_on", end),
    db
      .from("promo_posts")
      .select("title")
      .eq("org_id", org.id)
      .order("scheduled_on", { ascending: false })
      .limit(20),
  ]);

  const channels = new Map(((chans ?? []) as Channel[]).map((c) => [c.id, c]));
  const taken = new Set((existing ?? []).map((p) => `${p.channel_id}|${p.scheduled_on}`));

  const slots: Slot[] = [];
  for (const a of (autos ?? []) as Automation[]) {
    const ch = channels.get(a.channel_id);
    if (!ch) continue;
    for (let i = 0; i < days; i++) {
      const d = addDays(start, i);
      if (!a.weekdays.includes(weekday(d))) continue;
      if (taken.has(`${a.channel_id}|${d}`)) continue;
      slots.push({ automationId: a.id, channelId: a.channel_id, kind: ch.kind, date: d, time: a.post_time, topics: a.topics });
    }
  }
  slots.sort((x, y) => x.date.localeCompare(y.date));
  const work = slots.slice(0, MAX_SLOTS_PER_RUN);
  if (!work.length) return { created: 0, skipped: 0, message: "다음 일주일 콘텐츠가 이미 모두 준비돼 있어요." };

  await useAiQuota(db, org.id, "autogen");
  const b = await loadOrgBundle(db, org);
  const kinds = [...new Set(work.map((s) => s.kind))];
  const campaignLines = b.campaigns
    .map((c) => `- ${c.title} (${c.starts_on ?? "?"}~${c.ends_on ?? "?"}): ${c.summary ?? ""} ${c.brief ?? ""}`)
    .join("\n");

  const prompt = [
    "아래 학원의 다음 일주일 홍보 콘텐츠를 칸마다 하나씩 한국어로 작성하라.",
    "",
    "[학원 정보]",
    profileBlock(org.name, b.profile),
    "",
    brandBlock(b.guide),
    "",
    learningBlock(b.snapshot, b.prevSnapshot),
    "",
    seasonLine(start),
    campaignLines ? `[본사 진행 중 캠페인 - 관련 칸에 자연스럽게 반영]\n${campaignLines}` : "",
    "",
    "[채널별 형식]",
    kinds.map((k) => `- ${k} (${CHANNEL_KINDS[k].label}): ${channelGuide(k)}`).join("\n"),
    "",
    "[최근 제목 - 겹치지 않게]",
    ((recent ?? []).map((r) => r.title).filter(Boolean) as string[]).join("\n") || "없음",
    "",
    "[작성할 칸]",
    work.map((s, i) => `${i}. 날짜 ${s.date}, 채널 ${s.kind}, 주제 후보: ${s.topics.join(" / ") || "시즌과 학습 데이터에 맞게"}`).join("\n"),
    "",
    "같은 채널 안에서 주제가 반복되지 않게 후보를 돌아가며 쓰고, 날짜와 학교 시험·방학 시즌을 반영하라.",
    "학습 데이터가 있으면 일주일 중 1~2개 칸에서만 근거로 활용하라.",
    CONTENT_RULES,
    "",
    '답은 JSON 배열 하나: [{"slot":0,"title":"...","body":"...","hashtags":["#..."]}, ...] 칸 수만큼.',
  ]
    .filter((l) => l !== "")
    .join("\n");

  const results = await generatePostBatch(prompt, "promo/autogen");
  const rows = results
    .filter((r) => Number.isInteger(r.slot) && work[r.slot] && r.body)
    .map((r) => {
      const s = work[r.slot];
      return {
        org_id: org.id,
        channel_id: s.channelId,
        title: r.title,
        body: r.body,
        hashtags: r.hashtags,
        scheduled_on: s.date,
        scheduled_time: s.time,
        status: b.profile?.auto_approve ? "scheduled" : "pending",
        source: "auto",
        automation_id: s.automationId,
        created_by: opts.createdBy ?? null,
      };
    });
  if (rows.length) {
    const { error } = await db.from("promo_posts").insert(rows);
    if (error) throw new Error("게시물을 저장하지 못했어요: " + error.message);
    await db
      .from("promo_automations")
      .update({ last_generated_at: new Date().toISOString() })
      .in("id", [...new Set(work.map((s) => s.automationId))]);
  }
  const skipped = slots.length - rows.length;
  return {
    created: rows.length,
    skipped,
    message:
      `${rows.length}개 콘텐츠를 만들었어요.${b.profile?.auto_approve ? "" : " 컨펌 탭에서 확인해주세요."}` +
      (slots.length > MAX_SLOTS_PER_RUN ? ` 나머지 ${slots.length - MAX_SLOTS_PER_RUN}개는 다음 실행 때 만들어요.` : ""),
  };
}
