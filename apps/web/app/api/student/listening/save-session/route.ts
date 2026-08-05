export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentUser } from "@/lib/auth/get-user";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

interface Answer {
  questionId: string;
  choiceIndex: number;
  isCorrect: boolean;
}

interface SaveSessionRequest {
  testId: string;
  module: 1 | 2;
  difficulty: "hard" | "easy";
  answers: Answer[];
  correctCount: number;
  totalQuestions: number;
  assignmentId?: string;
  markAssignmentCompleted?: boolean;
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const {
      testId,
      module,
      difficulty,
      answers,
      correctCount,
      totalQuestions,
      assignmentId,
      markAssignmentCompleted,
    } = (await req.json()) as SaveSessionRequest;

    if (!testId || !answers || totalQuestions === 0) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const percentage = Math.round((correctCount / totalQuestions) * 100);

    // listening_results_2026 한 곳에 저장한다.
    // 예전에는 listening_sessions / listening_answers / listening_results 세 곳에
    // 나눠 썼는데, 그 테이블들은 옛 트랙 기반 스키마(track_id, mode, plays, band_score)라
    // 여기서 쓰던 컬럼(test_id, module, difficulty, status)이 아예 없었다.
    // 그래서 모든 제출이 실패했고 결과 테이블은 0행이었다.
    const { data: result, error: resultError } = await supabase
      .from("listening_results_2026")
      .insert({
        user_id: user.id,
        test_id: testId,
        assignment_id: assignmentId ?? null,
        module,
        difficulty,
        correct_count: correctCount,
        total_questions: totalQuestions,
        answers,
        finished_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (resultError || !result) {
      console.error("Listening result insert error:", resultError);
      return NextResponse.json(
        { ok: false, error: resultError?.message ?? "Failed to save result" },
        { status: 500 }
      );
    }

    // 배정을 통해 들어온 경우, Module 2까지 끝나면 assignment를 completed로 마감
    if (assignmentId && markAssignmentCompleted) {
      const { error: assignmentError } = await supabase
        .from("test_assignments")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", assignmentId)
        .eq("student_id", user.id);

      if (assignmentError) {
        console.error("Failed to mark assignment completed:", assignmentError);
      }
    }

    return NextResponse.json({
      ok: true,
      resultId: result.id,
      percentage,
      module,
      difficulty,
    });
  } catch (err: any) {
    console.error("LISTENING SAVE SESSION ERROR:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
