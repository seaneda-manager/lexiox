import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { results, totalPoints, finalLevel } = await req.json();

    if (!results || !Array.isArray(results)) {
      return NextResponse.json(
        { error: "Invalid results format" },
        { status: 400 }
      );
    }

    // 게임 세션 저장
    const { data: session, error: sessionError } = await supabase
      .from("vocab_game_sessions")
      .insert({
        user_id: user.id,
        game_type: "synonym_game",
        total_points: totalPoints,
        final_level: finalLevel,
        question_count: results.length,
        correct_count: results.filter((r: any) => r.correct).length,
      })
      .select("id")
      .single();

    if (sessionError) {
      console.error("Session insert error:", sessionError);
      return NextResponse.json(
        { error: "Failed to save session" },
        { status: 500 }
      );
    }

    // 게임 결과 저장
    const gameResults = results.map((r: any) => ({
      game_session_id: session.id,
      question_id: r.questionId,
      is_correct: r.correct,
      points_gained: r.pointsGained,
    }));

    const { error: resultsError } = await supabase
      .from("vocab_game_results")
      .insert(gameResults);

    if (resultsError) {
      console.error("Results insert error:", resultsError);
      return NextResponse.json(
        { error: "Failed to save results" },
        { status: 500 }
      );
    }

    // 사용자 게임 통계 업데이트
    const { data: existingStats } = await supabase
      .from("user_vocab_game_stats")
      .select("*")
      .eq("user_id", user.id)
      .eq("game_type", "synonym_game")
      .maybeSingle();

    if (existingStats) {
      // 기존 통계 업데이트
      await supabase
        .from("user_vocab_game_stats")
        .update({
          total_points: existingStats.total_points + totalPoints,
          total_games: existingStats.total_games + 1,
          total_questions: existingStats.total_questions + results.length,
          correct_count: existingStats.correct_count + results.filter((r: any) => r.correct).length,
          best_level: Math.max(existingStats.best_level || 0, finalLevel),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingStats.id);
    } else {
      // 새로운 통계 생성
      await supabase
        .from("user_vocab_game_stats")
        .insert({
          user_id: user.id,
          game_type: "synonym_game",
          total_points: totalPoints,
          total_games: 1,
          total_questions: results.length,
          correct_count: results.filter((r: any) => r.correct).length,
          best_level: finalLevel,
        });
    }

    return NextResponse.json({
      ok: true,
      sessionId: session.id,
      stats: {
        points: totalPoints,
        level: finalLevel,
        questionsAnswered: results.length,
        correctAnswers: results.filter((r: any) => r.correct).length,
      },
    });
  } catch (error) {
    console.error("Error saving game result:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
