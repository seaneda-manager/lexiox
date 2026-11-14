// lib/writing/reviewSession.ts
// 리뷰/Drill API 공용: 세션 접근 권한 확인 + 답안·과제 지시문 로드 + ai_review 캐시 읽기/쓰기 (서버 전용).
import "server-only";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { requireTeacherOrAdmin } from "@/lib/auth/requireTeacherOrAdmin";
import type { WWritingTest2026 } from "@/models/writing";
import type { ReviewInput } from "@/lib/writing/aiReview";
import type { WritingAiReview } from "@/lib/writing/reviewTypes";

export interface ReviewSessionContext {
  sessionId: string;
  input: ReviewInput;
  cached: WritingAiReview | null;
}

export type LoadResult =
  | { ok: true; ctx: ReviewSessionContext }
  | { ok: false; status: number; error: string };

function textOf(v: unknown): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && "content" in v) return String((v as any).content ?? "");
  return "";
}

/** 세션 소유자이거나 선생님/관리자일 때만 통과. */
export async function loadReviewSession(sessionId: string): Promise<LoadResult> {
  if (!sessionId) return { ok: false, status: 400, error: "sessionId required" };

  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, error: "로그인이 필요합니다" };

  // 서비스 키로 읽고 권한은 코드에서 판단 (RLS가 선생님 조회를 막는 경우 대비)
  const admin = getServiceSupabase();
  const { data: session } = await admin
    .from("writing_2026_sessions")
    .select("id, user_id, test_id, raw_answers")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return { ok: false, status: 404, error: "세션을 찾을 수 없습니다" };

  if ((session as any).user_id !== user.id) {
    try {
      await requireTeacherOrAdmin();
    } catch {
      return { ok: false, status: 403, error: "권한이 없습니다" };
    }
  }

  const answers = ((session as any).raw_answers ?? {}) as Record<string, any>;
  let emailPrompt = "";
  let discussionPrompt = "";
  const { data: testRow } = await admin
    .from("writing_tests")
    .select("payload")
    .eq("id", (session as any).test_id)
    .maybeSingle();
  if (testRow?.payload) {
    const test = testRow.payload as WWritingTest2026;
    for (const item of test.items ?? []) {
      if (item.taskKind === "email") {
        emailPrompt = [
          `Situation: ${item.situation}`,
          `Task: ${item.prompt}`,
          item.hints?.length ? `Points to address: ${item.hints.join("; ")}` : "",
        ].filter(Boolean).join("\n");
      } else if (item.taskKind === "academic_discussion") {
        discussionPrompt = [
          `Context: ${item.context}`,
          `Professor: ${item.professorPrompt}`,
          ...(item.studentPosts ?? []).map((p) => `${p.author}: ${p.content}`),
        ].join("\n");
      }
    }
  }

  // 캐시는 컬럼이 없으면 에러 → null 취급
  let cached: WritingAiReview | null = null;
  const { data: c, error: cErr } = await admin
    .from("writing_2026_sessions")
    .select("ai_review")
    .eq("id", sessionId)
    .maybeSingle();
  if (!cErr) cached = ((c as any)?.ai_review as WritingAiReview | null) ?? null;

  return {
    ok: true,
    ctx: {
      sessionId,
      input: {
        emailPrompt,
        discussionPrompt,
        emailText: textOf(answers.task_2_submission),
        discussionText: textOf(answers.task_3_submission),
      },
      cached,
    },
  };
}

/** 캐시 저장. ai_review 컬럼이 아직 없으면 조용히 건너뛴다(false). */
export async function saveReview(sessionId: string, review: WritingAiReview): Promise<boolean> {
  const { error } = await getServiceSupabase()
    .from("writing_2026_sessions")
    .update({ ai_review: review })
    .eq("id", sessionId);
  if (error) {
    console.warn("[Writing Review] cache save skipped:", error.message);
    return false;
  }
  return true;
}
