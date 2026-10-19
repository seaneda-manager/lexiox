import type { TestSubmitResponse, VocabTestQuestion } from "@/models/vocab/test.types";
import { POINTS_BASE } from "./scoring";
import { DEFAULT_TEST_CONFIG } from "./config";
import { applyTestOutcome } from "./cycle";

export type EndedBy = "submit" | "timeout";

export type FinalizedTest = TestSubmitResponse & {
  /** 이번 호출에서 채점을 확정했는지 (이미 확정된 세션을 다시 읽은 것이면 false) */
  finalized_now: boolean;
};

function toResponse(session: any, questions: VocabTestQuestion[], finalizedNow: boolean): FinalizedTest {
  return {
    session_id: session.id,
    score: session.score ?? 0,
    correct_count: session.correct_count ?? 0,
    total_count: session.total_count ?? questions.length,
    duration_seconds: session.duration_seconds ?? 0,
    total_points: session.total_points ?? 0,
    max_points: session.max_points ?? 0,
    best_streak: session.best_streak ?? 0,
    hints_used: session.hints_used ?? 0,
    passed: session.passed ?? (session.score ?? 0) >= (session.pass_score ?? DEFAULT_TEST_CONFIG.pass_score),
    pass_score: session.pass_score ?? DEFAULT_TEST_CONFIG.pass_score,
    ended_by: (session.ended_by as EndedBy | null) ?? "submit",
    questions,
    finalized_now: finalizedNow,
  };
}

async function loadQuestions(admin: any, sessionId: string): Promise<VocabTestQuestion[]> {
  const { data } = await admin
    .from("vocab_test_questions")
    .select("*")
    .eq("session_id", sessionId)
    .order("question_number", { ascending: true });
  return (data ?? []) as VocabTestQuestion[];
}

/**
 * 시험 채점 확정 (학생 제출 / 시간 만료 / 정리 크론 공용).
 * - 이미 graded 면 저장된 결과만 돌려준다 (재채점·재지급 없음)
 * - 답하지 않은 문제는 오답 처리
 * - 동시에 두 곳에서 호출돼도 한 쪽만 확정하도록 status 조건부 UPDATE 를 쓴다
 */
export async function finalizeSession(
  admin: any,
  sessionId: string,
  endedBy: EndedBy
): Promise<FinalizedTest | null> {
  const { data: session } = await admin
    .from("vocab_test_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return null;

  if (session.status === "graded") {
    return toResponse(session, await loadQuestions(admin, sessionId), false);
  }

  const questions = await loadQuestions(admin, sessionId);
  if (questions.length === 0) return null;

  const totalCount = questions.length;
  const correctCount = questions.filter((q) => q.is_correct === true).length;
  const score = Math.round((correctCount / totalCount) * 100);
  const totalPoints = questions.reduce((sum, q) => sum + (q.points_earned ?? 0), 0);
  const maxPoints = totalCount * POINTS_BASE;
  const passMark: number = session.pass_score ?? DEFAULT_TEST_CONFIG.pass_score;

  const nowMs = Date.now();
  const startedMs = new Date(session.started_at ?? session.created_at).getTime();
  const deadlineMs = session.deadline_at ? new Date(session.deadline_at).getTime() : null;
  // 시간 만료는 마감 시각까지만 응시한 것으로 본다
  const endMs = endedBy === "timeout" && deadlineMs ? Math.min(nowMs, deadlineMs) : nowMs;
  const durationSeconds = Math.max(0, Math.floor((endMs - startedMs) / 1000));

  const { data: claimed } = await admin
    .from("vocab_test_sessions")
    .update({
      status: "graded",
      score,
      correct_count: correctCount,
      total_count: totalCount,
      total_points: totalPoints,
      max_points: maxPoints,
      duration_seconds: durationSeconds,
      submitted_at: new Date(nowMs).toISOString(),
      pass_score: passMark,
      passed: score >= passMark,
      ended_by: endedBy,
    })
    .eq("id", sessionId)
    .neq("status", "graded")
    .select("*");

  if (!claimed || claimed.length === 0) {
    // 다른 호출이 먼저 확정했다
    const { data: latest } = await admin
      .from("vocab_test_sessions")
      .select("*")
      .eq("id", sessionId)
      .maybeSingle();
    return latest ? toResponse(latest, await loadQuestions(admin, sessionId), false) : null;
  }

  // 미응답 문제는 오답으로 확정
  await admin
    .from("vocab_test_questions")
    .update({ is_correct: false, points_earned: 0 })
    .eq("session_id", sessionId)
    .is("is_correct", null);

  await awardTestPoints(admin, session.student_id, sessionId, correctCount, totalCount, {
    total_points: totalPoints,
    max_points: maxPoints,
    best_streak: session.best_streak,
    hints_used: session.hints_used,
  });

  const finalQuestions = await loadQuestions(admin, sessionId);

  // 단어별 숙달 기록 + 불합격 시 필수 재학습 배정 (부가 작업: 실패해도 시험 결과는 유지)
  try {
    await applyTestOutcome(admin, claimed[0], finalQuestions);
  } catch (error) {
    console.warn("[vocab test] applyTestOutcome failed:", error);
  }

  return toResponse(claimed[0], finalQuestions, true);
}

async function awardTestPoints(
  _admin: any,
  userId: string,
  sessionId: string,
  correctCount: number,
  totalCount: number,
  meta: { total_points: number; max_points: number; best_streak: number; hints_used: number }
) {
  try {
    const { awardPoints } = await import("@/lib/gamification/awardPoints");

    // 보너스: 만점(모두 정답)이면 +5, 아니면 0
    const bonus = totalCount > 0 && correctCount === totalCount ? 5 : 0;

    await awardPoints({
      studentId: userId,
      ruleId: "vocab_exam",
      bonus,
      sourceRef: sessionId,
      metadata: { correct: correctCount, total: totalCount, ...meta },
    });
  } catch (error) {
    console.warn("Failed to award test points:", error);
    // non-fatal: 포인트 지급 실패해도 시험 결과는 저장됨
  }
}
