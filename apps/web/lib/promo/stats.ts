import { LEAD_STAGES } from "./constants";
import { addMonths, monthStart, todayKST } from "./dates";
import type { Channel, Lead, Post } from "./types";

export type StatsRange = "month" | "3m" | "all";

export function rangeStart(range: StatsRange): string {
  const m = monthStart(todayKST());
  if (range === "month") return m;
  if (range === "3m") return addMonths(m, -2);
  return "0000-01-01";
}

export const RANGE_LABEL: Record<StatsRange, string> = { month: "이번 달", "3m": "최근 3개월", all: "전체" };

const ORDER = ["inquiry", "booked", "consulted", "enrolled"];

export function computeStats(leads: Lead[], posts: Post[], channels: Channel[], range: StatsRange) {
  const from = rangeStart(range);
  const ls = leads.filter((l) => l.inquired_on >= from);
  const ps = posts.filter((p) => p.status === "posted" && p.scheduled_on >= from);
  const chName = (id: string | null) => channels.find((c) => c.id === id)?.name ?? null;

  const reached = (stage: string) =>
    ls.filter((l) => l.stage !== "on_hold" && ORDER.indexOf(l.stage) >= ORDER.indexOf(stage)).length;
  const funnel = [
    { label: "문의", value: ls.length },
    { label: "상담예약", value: reached("booked") },
    { label: "상담완료", value: reached("consulted") },
    { label: "등록", value: ls.filter((l) => l.stage === "enrolled").length },
  ];

  const src = new Map<string, { leads: number; enrolled: number }>();
  for (const l of ls) {
    const k = chName(l.source_channel_id) ?? l.source_label ?? "미입력";
    const v = src.get(k) ?? { leads: 0, enrolled: 0 };
    v.leads += 1;
    if (l.stage === "enrolled") v.enrolled += 1;
    src.set(k, v);
  }
  const sources = [...src.entries()]
    .map(([name, v]) => ({ name, ...v, rate: v.leads ? Math.round((v.enrolled / v.leads) * 100) : 0 }))
    .sort((a, b) => b.leads - a.leads);

  const pc = new Map<string, number>();
  for (const p of ps) {
    const k = chName(p.channel_id) ?? "채널 없음";
    pc.set(k, (pc.get(k) ?? 0) + 1);
  }
  const postsByChannel = [...pc.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);

  const gr = new Map<string, number>();
  for (const l of ls) gr.set(l.grade || "미입력", (gr.get(l.grade || "미입력") ?? 0) + 1);
  const byGrade = [...gr.entries()].map(([label, value]) => ({ label, value }));

  const enrolled = funnel[3].value;
  return {
    leads: ls.length,
    enrolled,
    conversion: ls.length ? Math.round((enrolled / ls.length) * 100) : 0,
    posted: ps.length,
    funnel,
    sources,
    postsByChannel,
    byGrade,
    stageCounts: LEAD_STAGES.map((s) => ({ label: s.label, value: ls.filter((l) => l.stage === s.key).length })),
  };
}

export type ComputedStats = ReturnType<typeof computeStats>;
