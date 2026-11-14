// lib/speaking/reviewSession.ts
// Speaking 리뷰/Drill API 공용: 접근 권한 확인 + 스크립트·문제 로드 + 캐시(meta.review_bundle) 읽기/쓰기 (서버 전용).
// 캐시는 speaking_results_2026.meta(jsonb) 안에 저장하므로 별도 마이그레이션이 필요 없다.
import "server-only";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { requireTeacherOrAdmin } from "@/lib/auth/requireTeacherOrAdmin";
import type { SpeakingReviewBundle } from "@/lib/speaking/reviewTypes";

export interface SpeakingReviewContext {
  resultId: string;
  prompt: string;
  script: string;
  durationSec: number | null;
  cached: SpeakingReviewBundle | null;
  /** 캐시 저장 시 기존 meta 를 보존하기 위한 값 */
  meta: Record<string, unknown>;
  /** 캐시가 현재 스크립트 기준인지 확인하기 위한 해시 */
  scriptKey: string;
  /** 이 결과를 낸 학생 본인인지 (선생님/관리자는 false) */
  isOwner: boolean;
}

export type SpeakingLoadResult =
  | { ok: true; ctx: SpeakingReviewContext }
  | { ok: false; status: number; error: string };

const keyOf = (script: string) => `${script.trim().length}:${script.trim().slice(0, 40)}:${script.trim().slice(-40)}`;

export async function loadSpeakingReviewSession(resultId: string): Promise<SpeakingLoadResult> {
  if (!resultId) return { ok: false, status: 400, error: "resultId required" };

  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, error: "로그인이 필요합니다" };

  const admin = getServiceSupabase();
  const { data: row } = await admin
    .from("speaking_results_2026")
    .select("id, user_id, prompt, script, meta")
    .eq("id", resultId)
    .maybeSingle();
  if (!row) return { ok: false, status: 404, error: "결과를 찾을 수 없습니다" };

  const isOwner = (row as any).user_id === user.id;
  if (!isOwner) {
    try {
      await requireTeacherOrAdmin();
    } catch {
      return { ok: false, status: 403, error: "권한이 없습니다" };
    }
  }

  const meta = (((row as any).meta ?? {}) as Record<string, unknown>) || {};
  const script = String((row as any).script ?? "");
  const rawDur = Number((meta as any).duration_sec ?? (meta as any).durationSec ?? (meta as any).audio_seconds);
  const bundle = (meta as any).review_bundle as (SpeakingReviewBundle & { scriptKey?: string }) | undefined;
  const scriptKey = keyOf(script);

  return {
    ok: true,
    ctx: {
      resultId,
      prompt: String((row as any).prompt ?? ""),
      script,
      durationSec: Number.isFinite(rawDur) && rawDur > 0 ? rawDur : null,
      // 스크립트를 고쳤다면 이전 리뷰는 더 이상 맞지 않으므로 무효
      cached: bundle && bundle.scriptKey === scriptKey ? bundle : null,
      meta,
      scriptKey,
      isOwner,
    },
  };
}

export async function saveSpeakingBundle(ctx: SpeakingReviewContext, bundle: SpeakingReviewBundle): Promise<boolean> {
  const { error } = await getServiceSupabase()
    .from("speaking_results_2026")
    .update({ meta: { ...ctx.meta, review_bundle: { ...bundle, scriptKey: ctx.scriptKey } } })
    .eq("id", ctx.resultId);
  if (error) {
    console.warn("[Speaking Review] cache save failed:", error.message);
    return false;
  }
  return true;
}
