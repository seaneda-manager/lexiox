import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { LearningStageData, Meaning } from "@/types/learning-stage";

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ wordId: string }> }
) {
  try {
    const { wordId } = await params;
    const supabase = await createAuthedServerClient();

    // 1. 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. 학생 정보 조회
    const { data: student, error: studentError } = await supabase
      .from("academy_students")
      .select("id, program_name, program_level")
      .eq("user_id", user.id)
      .single();

    if (studentError || !student) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }

    // 3. Learning Stage 데이터 조회
    const { data: lsItem, error: lsError } = await supabase
      .from("learning_stage_items")
      .select("*")
      .eq("word_id", wordId)
      .single();

    if (lsError) {
      return NextResponse.json(
        { error: "Word not found" },
        { status: 404 }
      );
    }

    // 거부된 데이터는 학생에게 노출하지 않음
    if (lsItem.data_status === "rejected") {
      return NextResponse.json(
        { error: "This content is unavailable", fallback: true },
        { status: 403 }
      );
    }

    // 모지바케 감지되면 Meaning 탭으로 스킵하는 응답
    let hasMojibake = false;
    if (lsItem.mojibake_detected) {
      hasMojibake = true;
      // 모지바케 플래그는 Admin이 해결할 때까지 학생에게 숨김
      return NextResponse.json(
        {
          error: "Content issue detected",
          mojibake: true,
          fallback: { tab: "meaning", message: "이 단어에 일부 오류가 있습니다. 뜻 학습으로 진행합니다." }
        },
        { status: 422 }
      );
    }

    // 4. 단어 정보 조회
    const { data: word, error: wordError } = await supabase
      .from("words")
      .select("id, word, pos")
      .eq("id", wordId)
      .single();

    if (wordError || !word) {
      return NextResponse.json(
        { error: "Word details not found" },
        { status: 404 }
      );
    }

    // 5. 진행 정보 조회 (같은 Day의 다른 단어들)
    const { data: dayWords } = await supabase
      .from("vocab_track_sets")
      .select("id, day_number, order_index")
      .eq("word_id", wordId)
      .single();

    // 6. 오늘의 진도 조회 (최대 2개)
    const today = new Date().toISOString().split("T")[0];
    const { data: todayAttempts } = await supabase
      .from("learning_stage_attempts")
      .select(
        "word_id, words(word, pos, meanings_ko), learning_stage_items(meaning_1)"
      )
      .eq("student_id", student.id)
      .eq("completed_at::date", today)
      .limit(2);

    const todayProgress = (todayAttempts || []).map((attempt: any) => ({
      word: attempt.words?.word || "",
      pos: attempt.words?.pos || "",
      meaning:
        attempt.words?.meanings_ko?.[0] ||
        attempt.learning_stage_items?.meaning_1 ||
        "",
    }));

    // 7. Streak 계산
    const { data: studentStats } = await supabase
      .from("academy_students")
      .select("learning_stage_streak, last_learning_stage_date")
      .eq("id", student.id)
      .single();

    const streak = studentStats?.learning_stage_streak || 0;

    // 8. 진행률 계산
    const { data: dayProgress } = await supabase
      .from("learning_stage_attempts")
      .select("id")
      .eq("student_id", student.id)
      .eq("completed_at::date", today);

    const dailyProgressPercent = Math.min(
      Math.round(((dayProgress?.length || 0) / 40) * 100),
      100
    );

    const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const { data: weekProgress } = await supabase
      .from("learning_stage_attempts")
      .select("id")
      .eq("student_id", student.id)
      .gte("completed_at::date", weekStart);

    const weeklyProgressPercent = Math.min(
      Math.round(((weekProgress?.length || 0) / 280) * 100),
      100
    );

    // 9. 의미 객체 생성
    const meanings: Meaning[] = [];
    if (lsItem.meaning_1) {
      meanings.push({
        id: 1,
        text: lsItem.meaning_1,
        textEn: lsItem.meaning_1_en || "",
        context: lsItem.meaning_context,
        pos: word.pos || "noun",
      });
    }
    if (lsItem.meaning_2) {
      meanings.push({
        id: 2,
        text: lsItem.meaning_2,
        textEn: lsItem.meaning_2_en || "",
        pos: word.pos || "noun",
      });
    }

    // 10. 응답 데이터 구성
    const response: LearningStageData = {
      wordId,
      course: student.program_name || "Learning Stage",
      progress: {
        currentDay: dayWords?.day_number || 1,
        totalDays: 60,
        wordPosition: `${dayWords?.order_index || 1}/40`,
      },
      spelling: {
        given: word.word,
        instructions: "위의 단어를 입력하세요",
      },
      meaning: {
        meanings,
        relatedWords: lsItem.meaning_related_words || [],
        definition: lsItem.meaning_definition_en || "",
        reportBrokenAvailable: true,
      },
      quiz: {
        instruction: "맞는 뜻을 고르세요",
        synonyms: lsItem.quiz_synonyms || [],
        example: {
          en: lsItem.quiz_example_en || "",
          ko: lsItem.quiz_example_ko || "",
        },
        choices: lsItem.quiz_choices || [],
      },
      todayProgress,
      streak,
      dailyProgressPercent,
      weeklyProgressPercent,
    };

    return NextResponse.json({ status: "success", data: response });
  } catch (error: any) {
    console.error("Learning Stage Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
