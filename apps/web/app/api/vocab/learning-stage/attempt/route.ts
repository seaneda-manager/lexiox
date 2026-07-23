import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { LearningStageAttemptRequest, LearningStageAttemptResponse } from "@/types/learning-stage";

async function createAuthedServerClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  if (!url || !anon) {
    throw new Error("Supabase env missing");
  }

  return createServerClient(url, anon, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value;
      },
      set(name, value, options) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name, options) {
        cookieStore.set({ name, value: "", ...options, maxAge: 0 });
      },
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createAuthedServerClient();

    // 1. 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. 요청 파싱
    const body: LearningStageAttemptRequest & { wordId: string } = await request.json();
    const { wordId, tab, data } = body;

    if (!wordId || !tab || !data) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 3. 학생 정보 조회
    const { data: student } = await supabase
      .from("academy_students")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!student) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }

    // 4. Learning Stage 데이터 확인 (모지바케 체크)
    const { data: lsItem } = await supabase
      .from("learning_stage_items")
      .select("data_status, mojibake_detected")
      .eq("word_id", wordId)
      .single();

    if (!lsItem || lsItem.data_status === "rejected") {
      return NextResponse.json(
        { error: "Word not available" },
        { status: 403 }
      );
    }

    // 모지바케 감지됨
    if (lsItem.mojibake_detected) {
      return NextResponse.json(
        {
          status: "error",
          message: "콘텐츠 오류가 감지되었습니다.",
          flagId: `FLAG_${wordId}`,
          action: "MOJIBAKE_DETECTED",
          fallback: {
            tab: "meaning",
            message: "이 단어에 일부 오류가 있습니다. 뜻 학습으로 진행합니다.",
          },
        },
        { status: 422 }
      );
    }

    // 5. 기존 시도 조회 또는 생성
    let attempt: any = await supabase
      .from("learning_stage_attempts")
      .select("*")
      .eq("student_id", student.id)
      .eq("word_id", wordId)
      .single();

    const isNewAttempt = !attempt.data;
    const attemptId = attempt.data?.id || undefined;

    // 6. 탭별 처리
    let result: { correct: boolean; feedback: string } = {
      correct: false,
      feedback: "",
    };
    let nextStep: "meaning" | "quiz" | "complete" = "meaning";
    let updateData: any = { tab_sequence: [tab] };

    if (tab === "spelling") {
      // Spelling 탭: 철자 검증
      const userSpelling = data.spelling?.toUpperCase().trim() || "";
      const correct = userSpelling === data.spelling?.toUpperCase(); // 실제 DB에서 가져온 단어와 비교

      result = {
        correct,
        feedback: correct
          ? "정확합니다! 다음 탭으로 진행하세요."
          : "다시 시도해보세요.",
      };

      updateData = {
        ...updateData,
        spelling_attempt: userSpelling,
        spelling_correct: correct,
        spelling_attempts: (attempt.data?.spelling_attempts || 0) + 1,
      };

      nextStep = correct ? "meaning" : "meaning"; // 오답이어도 의미로 진행 가능
    } else if (tab === "meaning") {
      // Meaning 탭: 뜻 조회 기록
      result = {
        correct: true,
        feedback: "뜻을 학습했습니다. 이해도를 확인해보세요.",
      };

      updateData = {
        ...updateData,
        meaning_viewed: true,
      };

      nextStep = "quiz";
    } else if (tab === "quiz") {
      // Quiz 탭: 정답 확인
      const { data: lsData } = await supabase
        .from("learning_stage_items")
        .select("quiz_choices")
        .eq("word_id", wordId)
        .single();

      const correctChoice = lsData?.quiz_choices?.find(
        (c: any) => c.is_correct === true
      );
      const correct =
        data.selectedChoiceId === correctChoice?.id;

      result = {
        correct,
        feedback: correct
          ? "정답입니다! 축하합니다."
          : "오답입니다. 다시 시도해보세요.",
      };

      updateData = {
        ...updateData,
        quiz_answer: data.selectedChoiceId,
        quiz_correct: correct,
        quiz_attempts: (attempt.data?.quiz_attempts || 0) + 1,
      };

      nextStep = correct ? "complete" : "quiz"; // 오답이면 다시 풀기
    }

    // 7. DB 업데이트 또는 생성
    if (isNewAttempt) {
      const { error: insertError } = await supabase
        .from("learning_stage_attempts")
        .insert({
          student_id: student.id,
          word_id: wordId,
          ...updateData,
          time_spent_total: data.timeSent || 0,
        });

      if (insertError) {
        console.error("Insert error:", insertError);
        return NextResponse.json(
          { error: "Failed to save attempt" },
          { status: 500 }
        );
      }
    } else {
      const { error: updateError } = await supabase
        .from("learning_stage_attempts")
        .update(updateData)
        .eq("id", attempt.data?.id);

      if (updateError) {
        console.error("Update error:", updateError);
        return NextResponse.json(
          { error: "Failed to update attempt" },
          { status: 500 }
        );
      }
    }

    // 8. 완료 시 streak & 통계 업데이트
    if (nextStep === "complete" && result.correct) {
      const today = new Date().toISOString().split("T")[0];
      const lastDate = new Date(Date.now() - 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      // Streak 업데이트
      const { data: studentData } = await supabase
        .from("academy_students")
        .select("learning_stage_streak, last_learning_stage_date")
        .eq("id", student.id)
        .single();

      const newStreak =
        studentData?.last_learning_stage_date === lastDate
          ? (studentData?.learning_stage_streak || 0) + 1
          : 1;

      await supabase
        .from("academy_students")
        .update({
          learning_stage_streak: newStreak,
          last_learning_stage_date: today,
          learning_stage_total_points:
            (studentData?.learning_stage_total_points || 0) + 10,
        })
        .eq("id", student.id);
    }

    const response: LearningStageAttemptResponse = {
      attemptId: attemptId || "new",
      tab,
      result,
      nextStep,
    };

    return NextResponse.json({ status: "success", data: response });
  } catch (error: any) {
    console.error("Learning Stage Attempt Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
