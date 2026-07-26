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
    } = (await req.json()) as SaveSessionRequest;

    if (!testId || !answers || totalQuestions === 0) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const percentage = Math.round((correctCount / totalQuestions) * 100);

    // 1. Create listening session
    const { data: session, error: sessionError } = await supabase
      .from("listening_sessions")
      .insert({
        user_id: user.id,
        test_id: testId,
        module,
        difficulty,
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (sessionError || !session) {
      console.error("Session creation error:", sessionError);
      return NextResponse.json(
        { ok: false, error: "Failed to create session" },
        { status: 500 }
      );
    }

    // 2. Insert all answers
    const answerRecords = answers.map((answer) => ({
      session_id: session.id,
      question_id: answer.questionId,
      chosen_choice_index: answer.choiceIndex,
      is_correct: answer.isCorrect,
    }));

    const { error: answersError } = await supabase
      .from("listening_answers")
      .insert(answerRecords);

    if (answersError) {
      console.error("Answers insertion error:", answersError);
      return NextResponse.json(
        { ok: false, error: "Failed to save answers" },
        { status: 500 }
      );
    }

    // 3. Create result record
    const { data: result, error: resultError } = await supabase
      .from("listening_results")
      .insert({
        session_id: session.id,
        module,
        difficulty,
        correct_count: correctCount,
        total_questions: totalQuestions,
        percentage,
      })
      .select()
      .single();

    if (resultError || !result) {
      console.error("Result creation error:", resultError);
      return NextResponse.json(
        { ok: false, error: "Failed to create result" },
        { status: 500 }
      );
    }

    // 4. If Module 1, determine Module 2 difficulty and return info
    let nextModuleDifficulty: "hard" | "easy" | null = null;
    if (module === 1) {
      nextModuleDifficulty = percentage >= 80 ? "hard" : "easy";
    }

    return NextResponse.json({
      ok: true,
      sessionId: session.id,
      resultId: result.id,
      percentage,
      module,
      difficulty,
      nextModuleDifficulty,
    });
  } catch (err: any) {
    console.error("LISTENING SAVE SESSION ERROR:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
