import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generatePostBatch, generateText, useAiQuota } from "./ai";
import { CHANNEL_KINDS, type ChannelKind } from "./constants";
import { addDays, todayKST } from "./dates";
import { loadOrgBundle } from "./data";
import { brandBlock, channelGuide, CONTENT_RULES, learningBlock, profileBlock, seasonLine } from "./prompts";
import { jsonrepair } from "jsonrepair";
import type { Channel, OrgProfile, PromoOrg } from "./types";

/**
 * 주간 트렌드 분석 → 2주 콘텐츠 플랜 → 컨펌 대기 게시물 생성
 *
 * 검색 추이: 네이버 데이터랩 검색어 트렌드 (상대 지수, 실제 검색량 아님)
 *   NAVER_DATALAB_CLIENT_ID / NAVER_DATALAB_CLIENT_SECRET
 *   NAVER_DATALAB_URL (기본: 개발자센터 엔드포인트. 네이버 클라우드 API HUB로 옮기면 그 주소로 바꾼다)
 * 키가 없으면 검색 추이 없이 시즌·학습 데이터만으로 플랜을 짠다.
 */

type Group = { groupName: string; keywords: string[] };
type TrendGroup = { name: string; recent: number; previous: number; change: number | null; series: number[] };

const PLAN_DAYS = 14;
const MAX_PLAN_POSTS = 12;

function firstToken(s: string | null | undefined) {
  return (s ?? "").split(/[\s,·/]+/).find(Boolean) ?? "";
}

/** 학원 정보로 기본 검색어 그룹을 만든다 (최대 5그룹, 그룹당 최대 20개 - 데이터랩 제한) */
export function buildKeywordGroups(p: OrgProfile | null): Group[] {
  const area = firstToken(p?.region);
  const subject = firstToken(p?.subjects) || "영어";
  const groups: Group[] = [];
  if (area) groups.push({ groupName: `${area} ${subject}학원`, keywords: [`${area} ${subject}학원`, `${area} ${subject}`, `${area} 학원`] });
  groups.push({ groupName: `중등 ${subject} 내신`, keywords: [`중등 ${subject}`, `중학 ${subject} 내신`, `${subject} 내신`] });
  groups.push({ groupName: `초등 ${subject}`, keywords: [`초등 ${subject}`, `초등 ${subject}학원`] });
  groups.push({ groupName: "방학 특강", keywords: ["겨울방학 특강", "여름방학 특강", "방학 특강"] });
  for (const k of p?.trend_keywords ?? []) {
    if (groups.length >= 5) break;
    if (k.trim()) groups.push({ groupName: k.trim(), keywords: [k.trim()] });
  }
  return groups.slice(0, 5);
}

export async function fetchSearchTrends(groups: Group[]): Promise<{ groups?: TrendGroup[]; error?: string }> {
  const id = process.env.NAVER_DATALAB_CLIENT_ID;
  const secret = process.env.NAVER_DATALAB_CLIENT_SECRET;
  if (!id || !secret) return { error: "네이버 데이터랩 키가 설정되지 않음" };
  const end = todayKST();
  const start = addDays(end, -7 * 12);
  try {
    const res = await fetch(process.env.NAVER_DATALAB_URL || "https://openapi.naver.com/v1/datalab/search", {
      method: "POST",
      headers: { "X-Naver-Client-Id": id, "X-Naver-Client-Secret": secret, "content-type": "application/json" },
      body: JSON.stringify({ startDate: start, endDate: end, timeUnit: "week", keywordGroups: groups }),
      cache: "no-store",
    });
    const j = (await res.json()) as { results?: { title: string; data: { period: string; ratio: number }[] }[]; errorMessage?: string };
    if (!res.ok) return { error: j.errorMessage ?? res.statusText };
    return {
      groups: (j.results ?? []).map((r) => {
        const series = r.data.map((d) => Math.round(d.ratio * 10) / 10);
        const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
        const recent = avg(series.slice(-4));
        const previous = avg(series.slice(-8, -4));
        return {
          name: r.title,
          series,
          recent: Math.round(recent * 10) / 10,
          previous: Math.round(previous * 10) / 10,
          change: previous ? Math.round(((recent - previous) / previous) * 100) : null,
        };
      }),
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

function parse<T>(text: string): T {
  const raw = (text.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1] ?? text).trim();
  const s = raw.search(/[[{]/);
  const e = Math.max(raw.lastIndexOf("}"), raw.lastIndexOf("]"));
  return JSON.parse(jsonrepair(s >= 0 && e > s ? raw.slice(s, e + 1) : raw)) as T;
}

/** 가맹점 1곳의 주간 트렌드 리포트 + 플랜 + 컨펌 대기 게시물 */
export async function runTrendPlan(db: SupabaseClient, org: PromoOrg, createdBy: string | null = null) {
  const b = await loadOrgBundle(db, org);
  const { data: chans } = await db.from("promo_channels").select("*").eq("org_id", org.id).eq("active", true);
  const channels = (chans ?? []) as Channel[];
  if (!channels.length) return { reportId: null, created: 0, message: "활성 채널이 없어 플랜을 만들지 않았어요." };

  await useAiQuota(db, org.id, "trend");
  const groups = buildKeywordGroups(b.profile);
  const trend = await fetchSearchTrends(groups);
  const today = todayKST();
  const kinds = [...new Set(channels.map((c) => c.kind))];

  const trendText = trend.groups?.length
    ? trend.groups
        .map((g) => `- ${g.name}: 최근 4주 평균 ${g.recent}, 그 전 4주 ${g.previous}${g.change == null ? "" : ` (${g.change >= 0 ? "+" : ""}${g.change}%)`}`)
        .join("\n")
    : `검색 추이 자료 없음 (${trend.error ?? "알 수 없음"}). 시즌과 학습 데이터로 판단할 것.`;

  const planPrompt = [
    "너는 초·중·고 학원 마케팅 전략가다. 아래 자료로 이번 주 트렌드를 분석하고 앞으로 2주 콘텐츠 플랜을 짜라.",
    "[학원 정보]",
    profileBlock(org.name, b.profile),
    learningBlock(b.snapshot, b.prevSnapshot),
    seasonLine(today),
    b.campaigns.length ? `[본사 캠페인]\n${b.campaigns.map((c) => `- ${c.title}: ${c.summary ?? ""}`).join("\n")}` : "",
    "[네이버 검색어 트렌드 - 상대 지수, 그룹 간 비교만 의미 있음]",
    trendText,
    `[운영 채널] ${kinds.join(", ")}`,
    `오늘 ${today}. 플랜 기간 ${addDays(today, 1)} ~ ${addDays(today, PLAN_DAYS)}. 채널별로 주 2~3회, 전체 ${MAX_PLAN_POSTS}개 이하.`,
    '답은 JSON 하나: {"summary":"3~4문장 요약","insights":["원장님이 알아야 할 점", "..."],"plan":[{"date":"YYYY-MM-DD","kind":"채널 종류","topic":"주제","angle":"어떤 관점·근거로 쓸지"}]}',
  ]
    .filter(Boolean)
    .join("\n");

  const planRaw = await generateText(planPrompt, "promo/trend-plan", 6000);
  const planObj = parse<{ summary?: string; insights?: string[]; plan?: { date: string; kind: string; topic: string; angle?: string }[] }>(planRaw);
  const plan = (planObj.plan ?? [])
    .filter((x) => kinds.includes(x.kind as ChannelKind) && /^\d{4}-\d{2}-\d{2}$/.test(x.date) && x.date > today)
    .slice(0, MAX_PLAN_POSTS);

  const { data: report, error: repErr } = await db
    .from("promo_trend_reports")
    .insert({
      org_id: org.id,
      period_start: today,
      keywords: groups,
      trend_data: trend,
      summary: planObj.summary ?? null,
      insights: planObj.insights ?? [],
      plan,
    })
    .select("id")
    .single();
  if (repErr) throw new Error("리포트를 저장하지 못했어요: " + repErr.message);

  if (!plan.length) return { reportId: report.id, created: 0, message: "리포트를 만들었어요. 플랜 항목은 없어요." };

  // 플랜 → 게시물 초안 (한 번에)
  const postPrompt = [
    "아래 콘텐츠 플랜의 각 항목을 실제 게시물로 한국어로 작성하라.",
    "[학원 정보]",
    profileBlock(org.name, b.profile),
    brandBlock(b.guide),
    learningBlock(b.snapshot, b.prevSnapshot),
    "[채널별 형식]",
    [...new Set(plan.map((p) => p.kind as ChannelKind))].map((k) => `- ${k} (${CHANNEL_KINDS[k].label}): ${channelGuide(k)}`).join("\n"),
    "[플랜]",
    plan.map((p, i) => `${i}. ${p.date} ${p.kind} - ${p.topic}${p.angle ? ` (${p.angle})` : ""}`).join("\n"),
    CONTENT_RULES,
    '답은 JSON 배열 하나: [{"slot":0,"title":"...","body":"...","hashtags":["#..."]}, ...]',
  ]
    .filter(Boolean)
    .join("\n");
  const posts = await generatePostBatch(postPrompt, "promo/trend-posts");

  const status = b.profile?.auto_approve ? "scheduled" : "pending";
  const rows = posts
    .filter((r) => Number.isInteger(r.slot) && plan[r.slot] && r.body)
    .map((r) => {
      const item = plan[r.slot];
      const ch = channels.find((c) => c.kind === item.kind)!;
      return {
        org_id: org.id,
        channel_id: ch.id,
        title: r.title,
        body: r.body,
        hashtags: r.hashtags,
        scheduled_on: item.date,
        status,
        source: "plan",
        trend_report_id: report.id,
        created_by: createdBy,
      };
    });
  if (rows.length) {
    const { error } = await db.from("promo_posts").insert(rows);
    if (error) throw new Error("게시물을 저장하지 못했어요: " + error.message);
    await db.from("promo_trend_reports").update({ posts_created: rows.length }).eq("id", report.id);
  }
  return {
    reportId: report.id,
    created: rows.length,
    message: `트렌드 리포트와 ${rows.length}개 게시물 초안을 만들었어요.${status === "pending" ? " 컨펌 탭에서 확인해주세요." : ""}`,
  };
}
