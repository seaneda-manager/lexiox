export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { type TestSubmitRequest, type TestSubmitResponse } from "@/models/vocab/test.types";
import { NextRequest, NextResponse } from "next/server";
import { POINTS_BASE } from "@/lib/vocab/test/scoring";

/**
 * POST /api/vocab/test/submit
 * 시험 제출 및 최종 채점
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

    const body: TestSubmitRequest = await req.json();
    const { session_id } = body;

    if (!session_id) {
      return NextResponse.json(
        { error: "Missing session_id" },
        { status: 400 }
      );
    }

    // 1. 세션 확인
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

    // 이미 채점된 세션이면 재채점/재지급 없이 저장된 결과만 반환
    if (session.status === "graded") {
      return NextResponse.json({
        session_id,
        score: session.score,
        correct_count: session.correct_count,
        total_count: session.total_count,
        duration_seconds: session.duration_seconds,
        total_points: session.total_points,
        max_points: session.max_points,
        best_streak: session.best_streak,
        hints_used: session.hints_used,
      } as TestSubmitResponse);
    }

    // 2. 모든 문제 조회
    const { data: questions } = await admin
      .from("vocab_test_questions")
      .select("*")
      .eq("session_id", session_id);

    if (!questions || questions.length === 0) {
      return NextResponse.json(
        { error: "No questions found" },
        { status: 404 }
      );
    }

    // 3. 채점
    const totalCount = questions.length;
    const correctCount = questions.filter(q => q.is_correct === true).length;
    const score = Math.round((correctCount / totalCount) * 100);
    const totalPoints = questions.reduce((sum, q) => sum + (q.points_earned ?? 0), 0);
    const maxPoints = totalCount * POINTS_BASE;
    const duration_seconds = Math.floor(
      (Date.now() - new Date(session.started_at).getTime()) / 1000
    );

    // 4. 세션 업데이트
    const nowISO = new Date().toISOString();
    const { error: updateError } = await admin
      .from("vocab_test_sessions")
      .update({
        status: "graded",
        score,
        correct_count: correctCount,
        total_count: totalCount,
        total_points: totalPoints,
        max_points: maxPoints,
        duration_seconds,
        submitted_at: nowISO,
      })
      .eq("id", session_id);

    if (updateError) {
      console.error("Failed to update session:", updateError);
      return NextResponse.json(
        { error: "Failed to update session" },
        { status: 500 }
      );
    }

    // 5. Gamification: 포인트 지급
    await awardTestPoints(admin, user.id, session_id, correctCount, totalCount, {
      total_points: totalPoints,
      max_points: maxPoints,
      best_streak: session.best_streak,
      hints_used: session.hints_used,
    });

    return NextResponse.json({
      session_id,
      score,
      correct_count: correctCount,
      total_count: totalCount,
      duration_seconds,
      total_points: totalPoints,
      max_points: maxPoints,
      best_streak: session.best_streak ?? 0,
      hints_used: session.hints_used ?? 0,
    } as TestSubmitResponse);
  } catch (error) {
    console.error("Test submit error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * 시험 결과에 따라 포인트 지급
 */
async function awardTestPoints(
  admin: any,
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
