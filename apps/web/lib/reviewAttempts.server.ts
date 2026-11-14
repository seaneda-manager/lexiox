// lib/reviewAttempts.server.ts
// Drill / 단어시험 시도 기록을 리뷰 JSON 에 이어 붙여 저장한다 (서버 전용).
import "server-only";
import { MAX_ATTEMPTS, type DrillAttempt } from "@/lib/reviewAttempts";
import { loadReviewSession, saveReview } from "@/lib/writing/reviewSession";
import { loadSpeakingReviewSession, saveSpeakingBundle } from "@/lib/speaking/reviewSession";

export async function appendWritingAttempt(sessionId: string, attempt: DrillAttempt): Promise<boolean> {
  const loaded = await loadReviewSession(sessionId);
  if (loaded.ok === false || !loaded.ctx.cached) return false;
  const cur = loaded.ctx.cached;
  return saveReview(sessionId, { ...cur, attempts: [...(cur.attempts ?? []), attempt].slice(-MAX_ATTEMPTS) });
}

export async function appendSpeakingAttempt(resultId: string, attempt: DrillAttempt): Promise<boolean> {
  const loaded = await loadSpeakingReviewSession(resultId);
  if (loaded.ok === false || !loaded.ctx.cached) return false;
  const cur = loaded.ctx.cached;
  return saveSpeakingBundle(loaded.ctx, { ...cur, attempts: [...(cur.attempts ?? []), attempt].slice(-MAX_ATTEMPTS) });
}
