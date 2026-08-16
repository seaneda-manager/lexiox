export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { type HintRequest, type HintResponse } from "@/models/vocab/test.types";
import { NextRequest, NextResponse } from "next/server";
import { hintsAllowed, hintReveal, basePointsFor, MAX_HINT_LEVEL } from "@/lib/vocab/test/scoring";

/**
 * POST /api/vocab/test/hint
 * 힌트 사용 (1회당 1글자/3글자 공개, 문제당 최대 2회, 서버가 카운터를 소유)
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

    const body: HintRequest = await req.json();
    const { session_id, question_id } = body;

    if (!session_id || !question_id) {
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

    if (question.is_correct !== null) {
      return NextResponse.json(
        { error: "already_answered" },
        { status: 409 }
      );
    }

    if (!hintsAllowed(question.question_type)) {
      return NextResponse.json(
        { error: "hints_not_available" },
        { status: 400 }
      );
    }

    const { hints_enabled, max_hint_level } = await getHintConfig(admin, user.id);

    if (!hints_enabled) {
      return NextResponse.json(
        { error: "hints_not_available" },
        { status: 400 }
      );
    }

    const effectiveMaxLevel = Math.min(max_hint_level, MAX_HINT_LEVEL);
    if (question.hint_level >= effectiveMaxLevel) {
      return NextResponse.json(
        { error: "hint_limit_reached" },
        { status: 409 }
      );
    }

    const nextHintLevel = (question.hint_level + 1) as 1 | 2;
    const reveal = hintReveal(question.question_type, question.correct_answer, nextHintLevel);

    // 3. 힌트 사용 기록
    const { error: updateError } = await admin
      .from("vocab_test_questions")
      .update({ hint_level: nextHintLevel })
      .eq("id", question_id);

    if (updateError) {
      console.error("Failed to record hint:", updateError);
      return NextResponse.json(
        { error: "Failed to record hint" },
        { status: 500 }
      );
    }

    await admin
      .from("vocab_test_sessions")
      .update({ hints_used: (session.hints_used ?? 0) + 1 })
      .eq("id", session_id);

    return NextResponse.json({
      question_id,
      hint_level: nextHintLevel,
      reveal,
      points_if_correct: basePointsFor(nextHintLevel),
    } as HintResponse);
  } catch (error) {
    console.error("Hint error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function getHintConfig(admin: any, userId: string): Promise<{
  hints_enabled: boolean;
  max_hint_level: number;
}> {
  const { data: global_config } = await admin
    .from("vocab_test_configs")
    .select("hints_enabled, max_hint_level")
    .eq("scope", "global")
    .single();

  let hints_enabled = global_config?.hints_enabled ?? true;
  let max_hint_level = global_config?.max_hint_level ?? MAX_HINT_LEVEL;

  const { data: student_config } = await admin
    .from("vocab_test_configs")
    .select("hints_enabled, max_hint_level")
    .eq("scope", "student")
    .eq("scope_id", userId)
    .single();

  if (student_config) {
    hints_enabled = student_config.hints_enabled;
    max_hint_level = student_config.max_hint_level;
  }

  return { hints_enabled, max_hint_level };
}
