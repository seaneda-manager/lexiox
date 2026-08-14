export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { type TestSubmitRequest, type TestSubmitResponse } from "@/models/vocab/test.types";
import { NextRequest, NextResponse } from "next/server";

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
    await awardTestPoints(admin, user.id, score, correctCount, totalCount);

    return NextResponse.json({
      session_id,
      score,
      correct_count: correctCount,
      total_count: totalCount,
      duration_seconds,
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
  score: number,
  correctCount: number,
  totalCount: number
) {
  try {
    const { awardPoints } = await import("@/lib/gamification/awardPoints");

    // 보너스: 100점이면 +5, 아니면 0
    const bonus = score === 100 ? 5 : 0;

    await awardPoints({
      studentId: userId,
      ruleId: "vocab_exam",
      bonus,
      metadata: { score, correct: correctCount, total: totalCount },
    });
  } catch (error) {
    console.warn("Failed to award test points:", error);
    // non-fatal: 포인트 지급 실패해도 시험 결과는 저장됨
  }
}
