import "server-only";
import { getServiceSupabase } from "@/lib/supabase/service";
import type { Usage } from "@anthropic-ai/sdk/resources/messages";

// 확인된 실사용 모델만 등록 (2026-08 기준 공개 요금, $ / 1M tokens).
// 목록에 없는 모델 문자열은 비용을 추정하지 않는다 (잘못된 숫자를 기록하는 것보다 null이 낫다) —
// 모델명 일관성 자체는 3단계(모델 티어 감사)에서 다룬다.
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-haiku-4-5-20251001": { input: 1, output: 5 },
  "claude-opus-4-8": { input: 5, output: 25 },
};

// 5분 ephemeral 캐시 쓰기는 표준 input가의 ~1.25배, 캐시 읽기는 ~10%.
const CACHE_WRITE_MULTIPLIER = 1.25;
const CACHE_READ_MULTIPLIER = 0.1;

function estimateCostUsd(model: string, usage: Usage): number | null {
  const pricing = MODEL_PRICING[model];
  if (!pricing) return null;

  const inputCost = (usage.input_tokens ?? 0) * pricing.input;
  const outputCost = (usage.output_tokens ?? 0) * pricing.output;
  const cacheWriteCost = (usage.cache_creation_input_tokens ?? 0) * pricing.input * CACHE_WRITE_MULTIPLIER;
  const cacheReadCost = (usage.cache_read_input_tokens ?? 0) * pricing.input * CACHE_READ_MULTIPLIER;

  return (inputCost + outputCost + cacheWriteCost + cacheReadCost) / 1_000_000;
}

/**
 * Anthropic API 호출 하나의 토큰 사용량을 ai_usage_logs에 기록한다.
 * 절대 호출자를 막거나 실패시키지 않는다 — fire-and-forget으로 쓰고, 내부에서 에러를 삼킨다.
 */
export async function logAnthropicUsage(route: string, model: string, usage: Usage): Promise<void> {
  try {
    const estimated_cost_usd = estimateCostUsd(model, usage);

    await getServiceSupabase().from("ai_usage_logs").insert({
      route,
      model,
      input_tokens: usage.input_tokens ?? 0,
      output_tokens: usage.output_tokens ?? 0,
      cache_creation_input_tokens: usage.cache_creation_input_tokens ?? 0,
      cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
      estimated_cost_usd,
    });
  } catch (err) {
    console.error(`[logAnthropicUsage] Failed to log usage for route "${route}":`, err);
  }
}
