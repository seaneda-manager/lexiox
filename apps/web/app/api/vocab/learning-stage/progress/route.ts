import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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

export async function GET(request: NextRequest) {
  try {
    const supabase = await createAuthedServerClient();
    const searchParams = request.nextUrl.searchParams;
    const courseId = searchParams.get("courseId");
    const dayId = searchParams.get("dayId");

    // 1. 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. 학생 정보 조회
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

    // 3. 해당 Day의 단어들 조회
    let wordsQuery = supabase
      .from("vocab_track_sets")
      .select("id, word_id, day_number, order_index, words(id, word, pos)");

    if (courseId) {
      wordsQuery = wordsQuery.eq("course_id", courseId);
    }
    if (dayId) {
      wordsQuery = wordsQuery.eq("day_number", parseInt(dayId));
    }

    const { data: dayWords, error: wordsError } = await wordsQuery.order(
      "order_index"
    );

    if (wordsError || !dayWords) {
      return NextResponse.json(
        { error: "Words not found" },
        { status: 404 }
      );
    }

    // 4. 각 단어별 진행 상황 조회
    const wordStatuses = await Promise.all(
      dayWords.map(async (w: any) => {
        const { data: attempt } = await supabase
          .from("learning_stage_attempts")
          .select(
            "spelling_correct, quiz_correct, spelling_attempts, quiz_attempts, completed_at"
          )
          .eq("student_id", student.id)
          .eq("word_id", w.word_id)
          .single();

        let status = "not_started";
        if (attempt) {
          if (attempt.completed_at) {
            status = "completed";
          } else {
            status = "in_progress";
          }
        }

        return {
          id: w.word_id,
          word: w.words?.word || "",
          status,
          tabsCompleted: attempt
            ? [
                attempt.spelling_correct && "spelling",
                attempt.quiz_correct && "quiz",
              ]
                .filter(Boolean)
                .concat(attempt.spelling_correct || attempt.quiz_correct ? ["meaning"] : [])
            : [],
          attempts: {
            spelling: attempt?.spelling_attempts || 0,
            quiz: attempt?.quiz_attempts || 0,
          },
        };
      })
    );

    // 5. 통계 계산
    const completed = wordStatuses.filter(
      (w: any) => w.status === "completed"
    ).length;
    const inProgress = wordStatuses.filter(
      (w: any) => w.status === "in_progress"
    ).length;
    const notStarted = wordStatuses.filter(
      (w: any) => w.status === "not_started"
    ).length;
    const total = wordStatuses.length;

    return NextResponse.json({
      status: "success",
      data: {
        course: courseId || "All",
        day: dayId ? parseInt(dayId) : 1,
        totalWords: total,
        completed,
        inProgress,
        notStarted,
        progress: total > 0 ? Math.round((completed / total) * 100) : 0,
        words: wordStatuses,
        summary: {
          completed,
          inProgress,
          notStarted,
          total,
        },
      },
    });
  } catch (error: any) {
    console.error("Learning Stage Progress Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
