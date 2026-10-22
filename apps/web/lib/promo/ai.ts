import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { jsonrepair } from "jsonrepair";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logAnthropicUsage } from "@/lib/ai/logAnthropicUsage";
import { DAILY_AI_LIMIT } from "./constants";
import { kstDayStartIso, todayKST } from "./dates";
import type { GeneratedPost } from "./types";

const MODEL = "claude-sonnet-4-6";
let _client: Anthropic | null = null;
const client = () => (_client ??= new Anthropic());

const SYSTEM =
  "너는 한국 초·중·고 학원 전문 마케팅 카피라이터다. 학부모가 신뢰할 수 있는 정확하고 구체적인 글을 쓴다. " +
  "요청한 JSON 형식으로만 답하고, 코드 블록이나 설명을 붙이지 않는다.";

export class PromoLimitError extends Error {}

/** 가맹점별 하루 AI 호출 한도 확인 후 기록 */
export async function useAiQuota(db: SupabaseClient, orgId: string, kind: string): Promise<void> {
  const since = kstDayStartIso(todayKST());
  const { count } = await db
    .from("promo_ai_runs")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .gte("created_at", since);
  if ((count ?? 0) >= DAILY_AI_LIMIT) {
    throw new PromoLimitError(`오늘 AI 생성 한도(${DAILY_AI_LIMIT}회)를 다 썼어요. 내일 다시 시도해주세요.`);
  }
  await db.from("promo_ai_runs").insert({ org_id: orgId, kind });
}

async function complete(prompt: string, route: string, maxTokens: number): Promise<string> {
  const msg = await client().messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: SYSTEM,
    messages: [{ role: "user", content: prompt }],
  });
  void logAnthropicUsage(route, MODEL, msg.usage);
  return msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

function parseJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fenced ? fenced[1] : text).trim();
  const start = raw.search(/[[{]/);
  const end = Math.max(raw.lastIndexOf("}"), raw.lastIndexOf("]"));
  const slice = start >= 0 && end > start ? raw.slice(start, end + 1) : raw;
  return JSON.parse(jsonrepair(slice));
}

function toPost(v: unknown): GeneratedPost {
  const o = (v ?? {}) as Record<string, unknown>;
  return {
    title: String(o.title ?? "").trim(),
    body: String(o.body ?? "").trim(),
    hashtags: Array.isArray(o.hashtags) ? o.hashtags.map((h) => String(h).trim()).filter(Boolean) : [],
  };
}

export async function generatePost(prompt: string, route: string): Promise<GeneratedPost> {
  const text = await complete(prompt, route, 4000);
  const post = toPost(parseJson(text));
  if (!post.body) throw new Error("AI가 빈 글을 돌려줬어요. 다시 시도해주세요.");
  return post;
}

export async function generatePostBatch(
  prompt: string,
  route: string
): Promise<(GeneratedPost & { slot: number })[]> {
  const text = await complete(prompt, route, 16000);
  const arr = parseJson(text);
  if (!Array.isArray(arr)) throw new Error("AI 응답 형식이 어긋났어요. 다시 시도해주세요.");
  return arr.map((v) => ({ ...toPost(v), slot: Number((v as { slot?: unknown })?.slot) }));
}

export async function generateText(prompt: string, route: string, maxTokens = 2000): Promise<string> {
  const msg = await client().messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: "너는 한국 초·중·고 학원 마케팅 컨설턴트다. 원장님이 바로 실행할 수 있게 구체적으로 쓴다.",
    messages: [{ role: "user", content: prompt }],
  });
  void logAnthropicUsage(route, MODEL, msg.usage);
  return msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}
