export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { type TestStartRequest, type TestStartResponse } from "@/models/vocab/test.types";
import { NextRequest, NextResponse } from "next/server";
import type { QuestionType, VocabTestQuestion } from "@/models/vocab/test.types";
import {
  computeTimeLimitSeconds,
  isSessionExpired,
  remainingSeconds,
  resolveTestConfig,
} from "@/lib/vocab/test/config";
import { finalizeSession } from "@/lib/vocab/test/finalize";
import { rebuildHintReveals, redactQuestionForClient } from "@/lib/vocab/test/redact";

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

    // 시험 설정 (코드 기본값 < global < student). scope_id 는 auth uid / academy id 어느 쪽이든 매칭
    const testConfig = await resolveTestConfig(admin, [user.id, studentId]);

    // 2. Day의 단어 목록 가져오기
    // Step 1: student_vocab_assignments에서 set_id 찾기 (학습 완료 확인에도 필요해서 먼저 조회)
    const { data: dayAssignment, error: dayAssignmentError } = await admin
      .from("student_vocab_assignments")
      .select("id, set_id, completed_at")
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

    // 3. Admin 설정에서 학습 확인 스킵 여부 확인
    const skipLearningCheck = testConfig.skip_learning_check;

    // 학습 완료 상태 확인 (skip_learning_check가 false일 때만)
    // 권위 신호: 해당 Day assignment.completed_at (깜지까지 끝내면 completeVocabDayAction이 기록).
    // 구데이터/누락 대비로 vocab_learning_attempts(know/spelling/speed) 폴백도 유지.
    const dayFullyCompleted = (dayAssignment as any).completed_at != null;
    if (!skipLearningCheck && !dayFullyCompleted) {
      const learningComplete = await checkLearningCompletion(
        admin,
        studentId,
        dayAssignment.set_id
      );

      if (!learningComplete.ok) {
        return NextResponse.json(
          { error: learningComplete.error },
          { status: 403 }
        );
      }
    }

    // 3.5. 이미 응시한 시험이면 재시작 대신 결과 안내, 진행 중이면 이어하기 (타이머 리셋 방지)
    const existing = await findExistingAttempt(admin, user.id, track_id, day_number, dayAssignment.id);
    if (existing.kind === "locked") {
      return NextResponse.json(
        { error: "already_taken", result: existing.result },
        { status: 409 }
      );
    }
    if (existing.kind === "resume") {
      return NextResponse.json(await buildResumeResponse(admin, existing.session, testConfig.pass_score));
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

    // 5. 포함 범위 결정 (학원 시험은 기본적으로 Day 전체 단어)
    const coverage_ratio = testConfig.coverage_ratio;
    const arrangement = testConfig.arrangement;

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

    // 출제 유형: 기본은 단어→뜻 / 뜻→단어. 듣고 쓰기 옵션은 PR4(listen_spell) 전까지 미출제
    const enabledTypes: QuestionType[] = ["word_to_meaning", "meaning_to_word"];

    // 7. 시험 세션 생성 (마감 시각은 문제 수가 정해진 뒤 기록)
    const { count: previousAttempts } = await admin
      .from("vocab_test_sessions")
      .select("id", { count: "exact", head: true })
      .eq("student_id", user.id)
      .eq("track_id", track_id)
      .eq("day_number", day_number);

    const startedAt = new Date();
    const { data: session, error: sessionError } = await admin
      .from("vocab_test_sessions")
      .insert({
        student_id: user.id,
        academy_student_id: studentRow?.id ?? null,
        assignment_id: dayAssignment.id,
        class_id: membership?.class_id ?? "",
        track_id,
        day_number,
        kind: "main",
        attempt_no: (previousAttempts ?? 0) + 1,
        pass_score: testConfig.pass_score,
        total_words_count,
        words_count,
        use_wrong_only,
        status: "in_progress",
        started_at: startedAt.toISOString(),
        // 문제 생성 중 실패해도 무기한 열려 있지 않도록 임시 마감(상한)을 먼저 걸어 둔다
        deadline_at: new Date(startedAt.getTime() + testConfig.max_total_minutes * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (sessionError || !session) {
      // 동시에 두 번 눌러 같은 회차를 만든 경우: 먼저 만들어진 세션으로 이어하기
      if ((sessionError as any)?.code === "23505") {
        const again = await findExistingAttempt(admin, user.id, track_id, day_number, dayAssignment.id);
        if (again.kind === "resume") {
          return NextResponse.json(await buildResumeResponse(admin, again.session, testConfig.pass_score));
        }
      }
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
      arrangement,
      enabledTypes
    );

    if (questions.length === 0) {
      await admin.from("vocab_test_sessions").delete().eq("id", session.id);
      return NextResponse.json(
        { error: "Failed to generate questions" },
        { status: 500 }
      );
    }

    // 9. 서버 기준 마감 시각 기록 (새로고침/다른 기기로도 리셋되지 않음)
    const timeLimitSeconds = computeTimeLimitSeconds(questions.length, testConfig);
    const deadlineAt = new Date(startedAt.getTime() + timeLimitSeconds * 1000).toISOString();
    await admin
      .from("vocab_test_sessions")
      .update({ deadline_at: deadlineAt })
      .eq("id", session.id);

    return NextResponse.json({
      session_id: session.id,
      questions: questions.map(redactQuestionForClient),
      total_count: questions.length,
      remaining_seconds: timeLimitSeconds,
      time_limit_seconds: timeLimitSeconds,
      pass_score: testConfig.pass_score,
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
  setId: string
): Promise<{ ok: boolean; error?: string }> {
  // 권위 신호는 completeVocabDayAction 이 찍는 student_vocab_assignments.completed_at.
  // 다만 구데이터/누락 대비로 vocab_learning_attempts 폴백도 둔다 —
  // saveVocabAttemptAction 이 매 단계(know/spelling/speed) 무조건 기록하므로,
  // "그 단계 시도 기록이 존재하는지"로 학습 진행 여부를 가늠할 수 있다.
  const requiredStages = ["know", "spelling", "speed"];

  for (const stage of requiredStages) {
    const { data: attempt } = await admin
      .from("vocab_learning_attempts")
      .select("id")
      .eq("student_id", studentId)
      .eq("set_id", setId)
      .eq("stage", stage)
      .limit(1)
      .maybeSingle();

    if (!attempt) {
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

type ExistingAttempt =
  | { kind: "none" }
  | { kind: "resume"; session: any }
  | { kind: "locked"; result: { score: number | null; passed: boolean | null; pass_score: number | null } };

/**
 * 같은 Day 시험의 기존 응시 상태를 판단한다.
 * - 진행 중(in_progress) + 마감 전: 이어하기
 * - 진행 중 + 마감 후: 시간 만료로 채점 확정 → 응시 완료 처리
 * - 새 규칙(passed 기록 있음)으로 채점된 본시험이 이 배정에 있으면 재응시 불가(locked).
 *   passed 가 null 인 구 데이터 세션은 잠금 대상이 아니다.
 */
async function findExistingAttempt(
  admin: any,
  userId: string,
  trackId: string,
  dayNumber: number,
  assignmentId: string
): Promise<ExistingAttempt> {
  const { data: open } = await admin
    .from("vocab_test_sessions")
    .select("*")
    .eq("student_id", userId)
    .eq("track_id", trackId)
    .eq("day_number", dayNumber)
    .eq("status", "in_progress")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (open) {
    if (!isSessionExpired(open)) {
      const { count: questionCount } = await admin
        .from("vocab_test_questions")
        .select("id", { count: "exact", head: true })
        .eq("session_id", open.id);
      if ((questionCount ?? 0) > 0) {
        return { kind: "resume", session: open };
      }
      // 문제 생성에 실패한 빈 세션: 버리고 새로 시작
      await admin.from("vocab_test_sessions").delete().eq("id", open.id);
    } else {
      await finalizeSession(admin, open.id, "timeout");
    }
  }

  const { data: taken } = await admin
    .from("vocab_test_sessions")
    .select("score, passed, pass_score")
    .eq("student_id", userId)
    .eq("assignment_id", assignmentId)
    .eq("kind", "main")
    .eq("status", "graded")
    .not("passed", "is", null)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (taken) {
    return {
      kind: "locked",
      result: { score: taken.score, passed: taken.passed, pass_score: taken.pass_score },
    };
  }
  return { kind: "none" };
}

async function buildResumeResponse(admin: any, session: any, fallbackPassScore: number): Promise<TestStartResponse> {
  const { data: rows } = await admin
    .from("vocab_test_questions")
    .select("*")
    .eq("session_id", session.id)
    .order("question_number", { ascending: true });
  const questions = (rows ?? []) as VocabTestQuestion[];

  return {
    session_id: session.id,
    questions: questions.map(redactQuestionForClient),
    total_count: questions.length,
    remaining_seconds: remainingSeconds(session),
    time_limit_seconds:
      session.deadline_at && session.started_at
        ? Math.round((new Date(session.deadline_at).getTime() - new Date(session.started_at).getTime()) / 1000)
        : null,
    pass_score: session.pass_score ?? fallbackPassScore,
    resumed: true,
    hint_reveals: rebuildHintReveals(questions),
    current_streak: session.current_streak ?? 0,
    best_streak: session.best_streak ?? 0,
    total_points: session.total_points ?? 0,
  };
}

async function generateQuestions(
  admin: any,
  sessionId: string,
  wordIds: string[],
  arrangement: string,
  enabledTypes: QuestionType[]
): Promise<VocabTestQuestion[]> {
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
      arrangement as "grouped" | "random",
      enabledTypes
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
