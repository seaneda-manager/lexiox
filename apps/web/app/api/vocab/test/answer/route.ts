export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { type AnswerSubmitRequest, type AnswerSubmitResponse } from "@/models/vocab/test.types";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/vocab/test/answer
 * 개별 답변 제출 및 실시간 채점
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

    // 3. 답변 채점
    const { scoreShortAnswer, scoreMultipleChoice } = await import(
      "@/lib/vocab/test/questionGenerator"
    );

    let is_correct = false;

    if (question.question_type === "word_to_meaning" || question.question_type === "meaning_to_word") {
      // 주관식 채점
      is_correct = scoreShortAnswer(answer, question.correct_answer);
    } else if (question.question_type === "synonym" || question.question_type === "listening") {
      // 객관식 채점
      is_correct = scoreMultipleChoice(answer, question.correct_answer, question.options);
    }

    // 4. 답변 저장
    const { error: updateError } = await admin
      .from("vocab_test_questions")
      .update({
        student_answer: answer,
        is_correct,
      })
      .eq("id", question_id);

    if (updateError) {
      console.error("Failed to save answer:", updateError);
      return NextResponse.json(
        { error: "Failed to save answer" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      question_id,
      is_correct,
    } as AnswerSubmitResponse);
  } catch (error) {
    console.error("Answer submit error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
