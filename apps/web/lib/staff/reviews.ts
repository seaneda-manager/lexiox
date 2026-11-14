// lib/staff/reviews.ts
// 선생님/관리자용 리뷰 관리 로직 (서버 전용).
// 흐름: 초안 생성(리뷰+Drill[+단어시험]) → 미리보기·수정 → 공개 / 공개 취소. 학생은 공개된 것만 받아 본다.
// 한 번 만든 초안은 다시 생성하지 않는다. 마음에 안 들면 직접 수정하거나, 초안일 때만 삭제 후 다시 만들 수 있다.
import "server-only";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { requireTeacherOrAdmin } from "@/lib/auth/requireTeacherOrAdmin";
import { generateWritingDrill, generateWritingReview } from "@/lib/writing/aiReview";
import { loadReviewSession, saveReview } from "@/lib/writing/reviewSession";
import { generateSpeakingDrill, generateSpeakingReview, generateSpeakingVocab } from "@/lib/speaking/aiReview";
import { loadSpeakingReviewSession, saveSpeakingBundle } from "@/lib/speaking/reviewSession";
import type { WritingAiReview } from "@/lib/writing/reviewTypes";
import type { SpeakingReviewBundle } from "@/lib/speaking/reviewTypes";

export type ReviewKind = "writing" | "speaking";

export class StaffError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const TABLE: Record<ReviewKind, string> = { writing: "writing_2026_sessions", speaking: "speaking_results_2026" };

/** 선생님/관리자 확인 + 이 학생 결과가 내 화면(RLS)에서 보이는지 확인 (선생님은 자기 학생만). */
export async function assertStaff(kind: ReviewKind, id: string): Promise<{ userId: string; role: "teacher" | "admin" }> {
  if (!id) throw new StaffError(400, "id required");
  let who;
  try {
    who = await requireTeacherOrAdmin();
  } catch (e) {
    const m = e instanceof Error ? e.message : "";
    throw new StaffError(m.startsWith("401") ? 401 : 403, m.startsWith("401") ? "로그인이 필요합니다" : "권한이 없습니다");
  }
  const supabase = await getServerSupabase();
  const { data } = await supabase.from(TABLE[kind]).select("id").eq("id", id).maybeSingle();
  if (!data) throw new StaffError(403, "이 학생의 결과를 볼 권한이 없습니다");
  return { userId: who.user.id, role: who.role };
}

const nowIso = () => new Date().toISOString();

// ── 초안 생성 ────────────────────────────────────────────────────────
export async function generateDraft(kind: ReviewKind, id: string): Promise<{ skipped: boolean }> {
  if (kind === "writing") {
    const loaded = await loadReviewSession(id);
    if (loaded.ok === false) throw new StaffError(loaded.status, loaded.error);
    const { ctx } = loaded;
    if (ctx.cached && (ctx.cached.email || ctx.cached.discussion)) return { skipped: true };

    const review = await generateWritingReview(ctx.input);
    const items = await generateWritingDrill(review);
    const draft: WritingAiReview = { ...review, drill: { generatedAt: nowIso(), items }, status: "draft" };
    const saved = await saveReview(ctx.sessionId, draft);
    if (!saved) throw new StaffError(500, "리뷰를 저장하지 못했습니다 (ai_review 컬럼 확인)");
    return { skipped: false };
  }

  const loaded = await loadSpeakingReviewSession(id);
  if (loaded.ok === false) throw new StaffError(loaded.status, loaded.error);
  const { ctx } = loaded;
  if (ctx.cached) return { skipped: true };
  if (!ctx.script.trim()) throw new StaffError(422, "스크립트가 없어 리뷰를 만들 수 없습니다");

  const { delivery, review, model } = await generateSpeakingReview({ prompt: ctx.prompt, script: ctx.script, durationSec: ctx.durationSec });
  const drillItems = await generateSpeakingDrill(review, ctx.prompt, ctx.script);
  const vocabItems = await generateSpeakingVocab({ review, script: ctx.script, prompt: ctx.prompt });
  const bundle: SpeakingReviewBundle = {
    version: 1,
    model,
    generatedAt: nowIso(),
    delivery,
    review,
    drill: { generatedAt: nowIso(), items: drillItems },
    vocab: { generatedAt: nowIso(), items: vocabItems },
    status: "draft",
  };
  const saved = await saveSpeakingBundle(ctx, bundle);
  if (!saved) throw new StaffError(500, "리뷰를 저장하지 못했습니다");
  return { skipped: false };
}

// ── 공개 / 공개 취소 ─────────────────────────────────────────────────
export async function setPublished(kind: ReviewKind, id: string, publish: boolean, userId: string) {
  const patch = publish
    ? { status: "published" as const, publishedAt: nowIso(), publishedBy: userId }
    : { status: "draft" as const, publishedAt: undefined, publishedBy: undefined };

  if (kind === "writing") {
    const loaded = await loadReviewSession(id);
    if (loaded.ok === false) throw new StaffError(loaded.status, loaded.error);
    if (!loaded.ctx.cached) throw new StaffError(409, "만들어진 리뷰가 없습니다");
    const ok = await saveReview(id, { ...loaded.ctx.cached, ...patch });
    if (!ok) throw new StaffError(500, "저장하지 못했습니다");
    return;
  }
  const loaded = await loadSpeakingReviewSession(id);
  if (loaded.ok === false) throw new StaffError(loaded.status, loaded.error);
  if (!loaded.ctx.cached) throw new StaffError(409, "만들어진 리뷰가 없습니다");
  const ok = await saveSpeakingBundle(loaded.ctx, { ...loaded.ctx.cached, ...patch });
  if (!ok) throw new StaffError(500, "저장하지 못했습니다");
}

// ── 본문 수정 (총평·모범답안 두 개) ──────────────────────────────────
export interface EditPatch {
  /** Writing 만: 어느 과제인지 */
  task?: "email" | "discussion";
  overview?: string;
  improvedText?: string;
  faceliftText?: string;
}

function applyEdit<T extends { overview: string; improved: { text: string }; facelift: { text: string } }>(r: T, e: EditPatch): T {
  const clean = (v: string | undefined) => (typeof v === "string" ? v.trim().slice(0, 4000) : undefined);
  const ov = clean(e.overview);
  const im = clean(e.improvedText);
  const fa = clean(e.faceliftText);
  return {
    ...r,
    overview: ov ?? r.overview,
    improved: { ...r.improved, text: im ?? r.improved.text },
    facelift: { ...r.facelift, text: fa ?? r.facelift.text },
  };
}

export async function editReview(kind: ReviewKind, id: string, e: EditPatch) {
  if (kind === "writing") {
    const loaded = await loadReviewSession(id);
    if (loaded.ok === false) throw new StaffError(loaded.status, loaded.error);
    const cur = loaded.ctx.cached;
    if (!cur) throw new StaffError(409, "만들어진 리뷰가 없습니다");
    const key = e.task === "discussion" ? "discussion" : "email";
    if (!cur[key]) throw new StaffError(404, "해당 과제의 리뷰가 없습니다");
    const next: WritingAiReview = { ...cur, [key]: applyEdit(cur[key]!, e) };
    if (!(await saveReview(id, next))) throw new StaffError(500, "저장하지 못했습니다");
    return;
  }
  const loaded = await loadSpeakingReviewSession(id);
  if (loaded.ok === false) throw new StaffError(loaded.status, loaded.error);
  const cur = loaded.ctx.cached;
  if (!cur) throw new StaffError(409, "만들어진 리뷰가 없습니다");
  const next: SpeakingReviewBundle = { ...cur, review: applyEdit(cur.review, e) };
  if (!(await saveSpeakingBundle(loaded.ctx, next))) throw new StaffError(500, "저장하지 못했습니다");
}

// ── 초안 삭제 (공개 취소 상태의 초안만) ──────────────────────────────
export async function deleteDraft(kind: ReviewKind, id: string) {
  const admin = getServiceSupabase();
  if (kind === "writing") {
    const loaded = await loadReviewSession(id);
    if (loaded.ok === false) throw new StaffError(loaded.status, loaded.error);
    if (loaded.ctx.cached?.status !== "draft") throw new StaffError(409, "초안 상태일 때만 삭제할 수 있습니다 (공개 중이면 먼저 공개를 취소하세요)");
    const { error } = await admin.from(TABLE.writing).update({ ai_review: null }).eq("id", id);
    if (error) throw new StaffError(500, error.message);
    return;
  }
  const loaded = await loadSpeakingReviewSession(id);
  if (loaded.ok === false) throw new StaffError(loaded.status, loaded.error);
  if (loaded.ctx.cached?.status !== "draft") throw new StaffError(409, "초안 상태일 때만 삭제할 수 있습니다 (공개 중이면 먼저 공개를 취소하세요)");
  const { review_bundle: _drop, ...rest } = loaded.ctx.meta as Record<string, unknown>;
  const { error } = await admin.from(TABLE.speaking).update({ meta: rest }).eq("id", id);
  if (error) throw new StaffError(500, error.message);
}
