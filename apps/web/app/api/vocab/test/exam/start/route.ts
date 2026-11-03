export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/vocab/test/exam/start  { exam_id }
 * 선생님이 출제한 시험을 학생이 시작/이어하기. 출제 스냅샷을 학생 전용 세션 문제로 복사해서
 * 기존 answer/submit 흐름을 그대로 쓴다. 한 시험은 1회 응시(채점 완료 후엔 결과만 반환).
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
          setAll: (list) => list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
        },
      }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { exam_id } = await req.json().catch(() => ({}));
    if (!exam_id) return NextResponse.json({ error: "Missing exam_id" }, { status: 400 });

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: target } = await admin
      .from("vocab_teacher_exam_targets")
      .select("exam_id")
      .eq("exam_id", exam_id)
      .eq("student_id", user.id)
      .maybeSingle();
    if (!target) return NextResponse.json({ error: "배정되지 않은 시험입니다." }, { status: 403 });

    const { data: exam } = await admin.from("vocab_teacher_exams").select("*").eq("id", exam_id).maybeSingle();
    if (!exam) return NextResponse.json({ error: "시험을 찾을 수 없습니다." }, { status: 404 });

    // 이미 응시한 세션이 있으면 이어하기 / 결과 반환
    const { data: existing } = await admin
      .from("vocab_test_sessions")
      .select("*")
      .eq("exam_id", exam_id)
      .eq("student_id", user.id)
      .order("started_at", { ascending: false });

    const graded = (existing ?? []).find((s: any) => s.status === "graded");
    if (graded) {
      return NextResponse.json({
        already_graded: true,
        session_id: graded.id,
        result: {
          session_id: graded.id,
          score: graded.score,
          correct_count: graded.correct_count,
          total_count: graded.total_count,
          duration_seconds: graded.duration_seconds,
          total_points: graded.total_points,
          max_points: graded.max_points,
          best_streak: graded.best_streak,
          hints_used: graded.hints_used,
        },
      });
    }

    const open = (existing ?? []).find((s: any) => s.status === "in_progress");
    if (open) {
      const { data: qs } = await admin
        .from("vocab_test_questions")
        .select("*")
        .eq("session_id", open.id)
        .order("question_number", { ascending: true });
      if (qs && qs.length > 0) return NextResponse.json(sessionPayload(open, qs));
    }

    // 새 세션
    const { data: membership } = await admin
      .from("academy_class_students")
      .select("class_id")
      .eq("student_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const snapshot: any[] = Array.isArray(exam.questions) ? exam.questions : [];
    if (snapshot.length === 0) return NextResponse.json({ error: "출제된 문제가 없습니다." }, { status: 404 });

    const { data: session, error: sErr } = await admin
      .from("vocab_test_sessions")
      .insert({
        student_id: user.id,
        class_id: membership?.class_id ?? "",
        track_id: exam.track_id,
        day_number: exam.day_from,
        total_words_count: snapshot.length,
        words_count: snapshot.length,
        use_wrong_only: false,
        status: "in_progress",
        started_at: new Date().toISOString(),
        exam_id,
      })
      .select()
      .single();
    if (sErr || !session) {
      console.error("exam session create failed:", sErr);
      return NextResponse.json({ error: "시험 세션 생성에 실패했습니다." }, { status: 500 });
    }

    const rows = snapshot.map((q, i) => ({
      id: `q-${session.id}-${i + 1}`,
      session_id: session.id,
      question_number: i + 1,
      word_id: q.word_id,
      word_text: q.word_text,
      question_type: q.question_type,
      options: q.options,
      correct_answer: q.correct_answer,
      meaning_ko: q.meaning_ko,
      audio_url: q.audio_url ?? null,
    }));
    const { error: qErr } = await admin.from("vocab_test_questions").insert(rows);
    if (qErr) {
      console.error("exam questions insert failed:", qErr);
      await admin.from("vocab_test_sessions").delete().eq("id", session.id);
      return NextResponse.json({ error: "문제 생성에 실패했습니다." }, { status: 500 });
    }

    const { data: qs } = await admin
      .from("vocab_test_questions")
      .select("*")
      .eq("session_id", session.id)
      .order("question_number", { ascending: true });
    return NextResponse.json(sessionPayload(session, qs ?? []));
  } catch (e) {
    console.error("exam start error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function sessionPayload(session: any, qs: any[]) {
  return {
    session_id: session.id,
    questions: qs.map(q => ({ ...q, hint_level: q.hint_level ?? 0, streak_bonus: q.streak_bonus ?? 0 })),
    current_streak: session.current_streak ?? 0,
    best_streak: session.best_streak ?? 0,
    total_points: session.total_points ?? 0,
  };
}
