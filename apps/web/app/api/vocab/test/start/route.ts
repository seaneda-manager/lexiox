export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { type TestStartRequest, type TestStartResponse } from "@/models/vocab/test.types";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/vocab/test/start
 * 시험 세션 시작 및 문제 생성 (v2)
 */
export async function POST(req: NextRequest) {
  try {
    // 1. 인증 확인
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

    const body: TestStartRequest = await req.json();
    const { track_id, day_number, use_wrong_only = false } = body;

    if (!track_id || day_number === undefined) {
      return NextResponse.json(
        { error: "Missing track_id or day_number" },
        { status: 400 }
      );
    }

    // 1.5. academy_students.id 확인 (student_vocab_assignments 등은 auth uid가 아니라 이 id를 씀)
    const { data: studentRow } = await admin
      .from("academy_students")
      .select("id")
      .or(`user_id.eq.${user.id},auth_user_id.eq.${user.id},profile_id.eq.${user.id}`)
      .maybeSingle();

    const studentId = studentRow?.id ?? user.id;

    // 2. Admin 설정에서 학습 확인 스킵 여부 확인
    const { data: config } = await admin
      .from("vocab_test_configs")
      .select("skip_learning_check")
      .eq("scope", "global")
      .single();

    const skipLearningCheck = config?.skip_learning_check ?? false;

    // 학습 완료 상태 확인 (skip_learning_check가 false일 때만)
    if (!skipLearningCheck) {
      const learningComplete = await checkLearningCompletion(
        admin,
        studentId,
        track_id,
        day_number
      );

      if (!learningComplete.ok) {
        return NextResponse.json(
          { error: learningComplete.error },
          { status: 403 }
        );
      }
    }

    // 3. Day의 단어 목록 가져오기
    // Step 1: student_vocab_assignments에서 set_id 찾기
    const { data: dayAssignment, error: dayAssignmentError } = await admin
      .from("student_vocab_assignments")
      .select("set_id")
      .eq("student_id", studentId)
      .eq("track_id", track_id)
      .eq("day_index", day_number)
      .single();

    if (dayAssignmentError || !dayAssignment) {
      return NextResponse.json(
        { error: "No day set found for this track" },
        { status: 404 }
      );
    }

    // Step 2: vocab_set_items에서 word_id들 찾기
    const { data: dayWords, error: wordsError } = await admin
      .from("vocab_set_items")
      .select("word_id")
      .eq("set_id", dayAssignment.set_id)
      .order("sort_order", { ascending: true });

    if (wordsError || !dayWords || dayWords.length === 0) {
      return NextResponse.json(
        { error: "No words found for this day" },
        { status: 404 }
      );
    }

    const total_words_count = dayWords.length;
    let wordIds = dayWords.map((w: any) => w.word_id);

    // 4. "틀린 것만 보기" 옵션 처리
    if (use_wrong_only) {
      const wrongCheckResult = await checkWrongOnlyOption(
        admin,
        studentId,
        track_id,
        day_number,
        total_words_count
      );

      if (!wrongCheckResult.ok) {
        return NextResponse.json(
          { error: wrongCheckResult.error, reason: wrongCheckResult.reason },
          { status: 400 }
        );
      }

      wordIds = wrongCheckResult.wordIds!;
    }

    // 5. 포함 범위 결정
    const configResult = await getTestConfig(admin, user.id);
    const coverage_ratio = configResult.coverage_ratio;
    const arrangement = configResult.arrangement;

    const words_count = Math.max(
      Math.ceil((total_words_count * coverage_ratio) / 100),
      Math.min(wordIds.length, dayWords.length)
    );

    // 6.5. Class ID 조회 (academy_class_students.student_id는 auth uid를 참조함)
    const { data: membership } = await admin
      .from("academy_class_students")
      .select("class_id")
      .eq("student_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // 7. 시험 세션 생성
    const { data: session, error: sessionError } = await admin
      .from("vocab_test_sessions")
      .insert({
        student_id: user.id,
        class_id: membership?.class_id ?? "",
        track_id,
        day_number,
        total_words_count,
        words_count,
        use_wrong_only,
        status: "in_progress",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Failed to create test session" },
        { status: 500 }
      );
    }

    // 8. 문제 생성
    const questions = await generateQuestions(
      admin,
      session.id,
      wordIds.slice(0, words_count),
      arrangement
    );

    return NextResponse.json({
      session_id: session.id,
      questions,
      total_count: questions.length,
    } as TestStartResponse);
  } catch (error) {
    console.error("Test start error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────

async function checkLearningCompletion(
  admin: any,
  studentId: string,
  trackId: string,
  dayNumber: number
): Promise<{ ok: boolean; error?: string }> {
  // 각 Stage별 assignment 확인
  // Stage: "know"(PreScreen), 2(Spelling), 1(Learning), "speed"(Speed), "memorize"(Memorization)

  const requiredStages = ["know", 1, 2, "speed", "memorize"];
  const dayIndexMap = dayNumber; // student_vocab_assignments.day_index는 day_number와 동일하게 1부터 시작

  for (const stage of requiredStages) {
    const { data: assignment } = await admin
      .from("student_vocab_assignments")
      .select("completed_at")
      .eq("student_id", studentId)
      .eq("track_id", trackId)
      .eq("day_index", dayIndexMap)
      .eq("stage", stage)
      .single();

    if (!assignment?.completed_at) {
      return { ok: false, error: `Stage ${stage} not completed` };
    }
  }

  return { ok: true };
}

async function checkWrongOnlyOption(
  admin: any,
  studentId: string,
  trackId: string,
  dayNumber: number,
  totalWordsCount: number
): Promise<{
  ok: boolean;
  error?: string;
  reason?: string;
  wordIds?: string[];
}> {
  // vocab_learning_attempts에서 PreScreen(stage='know')의 틀린 단어 가져오기
  const { data: attempts } = await admin
    .from("vocab_learning_attempts")
    .select("wrong_word_ids")
    .eq("student_id", studentId)
    .eq("stage", "know")
    .order("attempted_at", { ascending: false })
    .limit(1)
    .single();

  if (!attempts?.wrong_word_ids || attempts.wrong_word_ids.length === 0) {
    return { ok: false, error: "No wrong words found" };
  }

  const wrongCount = attempts.wrong_word_ids.length;
  const minimumRequired = Math.ceil(totalWordsCount * 0.7);

  if (wrongCount < 10 || wrongCount < minimumRequired) {
    return {
      ok: false,
      error: "Wrong words are less than minimum required",
      reason: `Minimum ${minimumRequired} words required, but only ${wrongCount} wrong words`,
    };
  }

  return { ok: true, wordIds: attempts.wrong_word_ids };
}

async function getTestConfig(admin: any, userId: string): Promise<{
  coverage_ratio: number;
  arrangement: string;
}> {
  // 1. Global 설정 조회
  const { data: global_config } = await admin
    .from("vocab_test_configs")
    .select("coverage_ratio, arrangement")
    .eq("scope", "global")
    .single();

  let coverage_ratio = global_config?.coverage_ratio ?? 70;
  let arrangement = global_config?.arrangement ?? "grouped";

  // 2. Student 개별 설정 오버라이드
  const { data: student_config } = await admin
    .from("vocab_test_configs")
    .select("coverage_ratio, arrangement")
    .eq("scope", "student")
    .eq("scope_id", userId)
    .single();

  if (student_config) {
    coverage_ratio = student_config.coverage_ratio;
    arrangement = student_config.arrangement;
  }

  return { coverage_ratio, arrangement };
}

async function generateQuestions(
  admin: any,
  sessionId: string,
  wordIds: string[],
  arrangement: string
): Promise<any[]> {
  try {
    const { generateTestQuestions } = await import("@/lib/vocab/test/questionGenerator");

    // 1. 단어 상세 정보 조회
    const { data: words } = await admin
      .from("words")
      .select("id, text, meanings_ko, meanings_en_simple")
      .in("id", wordIds);

    if (!words || words.length === 0) {
      console.error("No words found for question generation");
      return [];
    }

    // 1.5. 동의어 조회 (words.synonyms_en_simple은 항상 비어있어 실제 데이터가 있는
    // word_synonyms 테이블에서 가져온다 - 동의어 게임(synonym-game)과 같은 소스)
    const { data: synonymRows } = await admin
      .from("word_synonyms")
      .select("word_id, synonym:words!word_synonyms_synonym_word_id_fkey(text)")
      .in("word_id", wordIds)
      .eq("tier", 1);

    const synonymsByWordId = new Map<string, string[]>();
    for (const row of synonymRows || []) {
      const text = (row as any).synonym?.text;
      if (!text) continue;
      const list = synonymsByWordId.get(row.word_id) ?? [];
      list.push(text);
      synonymsByWordId.set(row.word_id, list);
    }

    const wordDataMap = new Map(
      words.map((w: any) => [
        w.id,
        {
          id: w.id,
          text: w.text,
          meanings_ko: w.meanings_ko || [],
          meanings_en: w.meanings_en_simple || [],
          synonyms: synonymsByWordId.get(w.id) || [],
          audio_url: null,
        },
      ])
    );

    // 2. 문제 생성
    const questions = await generateTestQuestions(
      sessionId,
      wordIds,
      wordDataMap,
      arrangement as "grouped" | "random"
    );

    // 3. DB에 저장
    if (questions.length > 0) {
      const { error: insertError } = await admin
        .from("vocab_test_questions")
        .insert(questions.map(q => ({
          id: q.id,
          session_id: q.session_id,
          question_number: q.question_number,
          word_id: q.word_id,
          word_text: q.word_text,
          question_type: q.question_type,
          options: q.options,
          correct_answer: q.correct_answer,
          meaning_ko: q.meaning_ko,
          audio_url: q.audio_url,
        })));

      if (insertError) {
        console.error("Failed to insert questions:", insertError);
        // 저장 실패해도 클라이언트에는 문제 반환 (메모리 기반)
      }
    }

    return questions;
  } catch (error) {
    console.error("Question generation error:", error);
    return [];
  }
}
