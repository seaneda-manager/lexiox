export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { type AnswerSubmitRequest, type AnswerSubmitResponse } from "@/models/vocab/test.types";
import { NextRequest, NextResponse } from "next/server";
import { scoreAnswer } from "@/lib/vocab/test/scoring";

/**
 * POST /api/vocab/test/answer
 * 개별 답변 제출 및 실시간 채점 (힌트 차감 + 연속정답 보너스 포함)
 */
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookies) => {
            cookies.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body: AnswerSubmitRequest = await req.json();
    const { session_id, question_id, answer } = body;

    if (!session_id || !question_id || answer === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 1. 세션 확인 (권한 확인)
    const { data: session } = await admin
      .from("vocab_test_sessions")
      .select("*")
      .eq("id", session_id)
      .eq("student_id", user.id)
      .single();

    if (!session) {
      return NextResponse.json(
        { error: "Session not found or unauthorized" },
        { status: 404 }
      );
    }

    // 2. 문제 조회
    const { data: question } = await admin
      .from("vocab_test_questions")
      .select("*")
      .eq("id", question_id)
      .eq("session_id", session_id)
      .single();

    if (!question) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 }
      );
    }

    // 2.5. 재제출 방지 (이미 채점된 문제는 재답변 불가 — MC 정답 재클릭 악용 방지)
    if (question.is_correct !== null) {
      return NextResponse.json(
        { error: "already_answered" },
        { status: 409 }
      );
    }

    // 3. 답변 채점
    const { scoreShortAnswer, scoreMultipleChoice } = await import(
      "@/lib/vocab/test/questionGenerator"
    );

    let is_correct = false;

    if (question.question_type === "word_to_meaning" || question.question_type === "meaning_to_word") {
      is_correct = scoreShortAnswer(answer, question.correct_answer);
    } else if (question.question_type === "synonym" || question.question_type === "listening") {
      is_correct = scoreMultipleChoice(answer, question.correct_answer, question.options);
    }

    const streakBefore = session.current_streak ?? 0;
    const result = scoreAnswer({
      questionType: question.question_type,
      isCorrect: is_correct,
      hintLevel: question.hint_level ?? 0,
      streakBefore,
    });

    // 4. 답변 저장
    const { error: updateError } = await admin
      .from("vocab_test_questions")
      .update({
        student_answer: answer,
        is_correct,
        points_earned: result.points_earned,
        streak_before: streakBefore,
        streak_bonus: result.streak_bonus,
        answered_at: new Date().toISOString(),
        answer_seq: (session.answered_count ?? 0) + 1,
      })
      .eq("id", question_id);

    if (updateError) {
      console.error("Failed to save answer:", updateError);
      return NextResponse.json(
        { error: "Failed to save answer" },
        { status: 500 }
      );
    }

    // 5. 세션 스트릭/포인트 갱신 (낙관적 동시성 가드)
    const nextBestStreak = Math.max(session.best_streak ?? 0, result.streak_after);
    const nextTotalPoints = (session.total_points ?? 0) + result.points_earned;
    const nextAnsweredCount = (session.answered_count ?? 0) + 1;

    const { error: sessionUpdateError } = await admin
      .from("vocab_test_sessions")
      .update({
        current_streak: result.streak_after,
        best_streak: nextBestStreak,
        total_points: nextTotalPoints,
        answered_count: nextAnsweredCount,
      })
      .eq("id", session_id)
      .eq("answered_count", session.answered_count ?? 0);

    if (sessionUpdateError) {
      console.error("Failed to update session streak/points:", sessionUpdateError);
    }

    return NextResponse.json({
      question_id,
      is_correct,
      base_points: result.base_points,
      streak_bonus: result.streak_bonus,
      points_earned: result.points_earned,
      current_streak: result.streak_after,
      best_streak: nextBestStreak,
      session_total_points: nextTotalPoints,
    } as AnswerSubmitResponse);
  } catch (error) {
    console.error("Answer submit error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
