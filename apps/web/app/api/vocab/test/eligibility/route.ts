export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/vocab/test/eligibility?track_id=<trackId>&day=<dayNumber>
 *
 * 해당 Day의 "단어 학습 숙제(깜지까지)"가 완료되어 학원 단어 시험을 볼 수 있는지,
 * 그리고 이미 시험을 봤다면 점수를 반환한다.
 *
 * day 미지정 시: 가장 최근에 학습 완료한 Day를 대상으로 판정한다.
 */
export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const trackId = searchParams.get("track_id");
    const dayParam = searchParams.get("day");

    if (!trackId) {
      return NextResponse.json({ error: "Missing track_id" }, { status: 400 });
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // academy_students.id (student_vocab_assignments 등은 auth uid가 아니라 이 id를 씀)
    const { data: studentRow } = await admin
      .from("academy_students")
      .select("id")
      .or(`user_id.eq.${user.id},auth_user_id.eq.${user.id},profile_id.eq.${user.id}`)
      .maybeSingle();

    const academyStudentId = studentRow?.id ?? user.id;

    // 대상 Day 결정
    let day: number | null =
      dayParam != null && Number.isFinite(Number(dayParam)) ? Math.floor(Number(dayParam)) : null;

    if (day == null) {
      const { data: latest } = await admin
        .from("student_vocab_assignments")
        .select("day_index")
        .eq("student_id", academyStudentId)
        .eq("track_id", trackId)
        .not("completed_at", "is", null)
        .order("day_index", { ascending: false })
        .limit(1)
        .maybeSingle();
      day = typeof latest?.day_index === "number" ? latest.day_index : null;
    }

    // skip_learning_check (global)
    const { data: config } = await admin
      .from("vocab_test_configs")
      .select("skip_learning_check")
      .eq("scope", "global")
      .maybeSingle();
    const skipLearningCheck = config?.skip_learning_check ?? false;

    // 해당 Day assignment 완료 여부
    let dayComplete = skipLearningCheck;
    if (day != null && !dayComplete) {
      const { data: asg } = await admin
        .from("student_vocab_assignments")
        .select("completed_at")
        .eq("student_id", academyStudentId)
        .eq("track_id", trackId)
        .eq("day_index", day)
        .maybeSingle();
      dayComplete = asg?.completed_at != null;
    }

    // 시험 응시/점수 (vocab_test_sessions.student_id는 auth uid)
    let testTaken = false;
    let score: number | null = null;
    let testDate: string | null = null;
    if (day != null) {
      const { data: sess } = await admin
        .from("vocab_test_sessions")
        .select("score, submitted_at")
        .eq("student_id", user.id)
        .eq("track_id", trackId)
        .eq("day_number", day)
        .eq("status", "graded")
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (sess) {
        testTaken = true;
        score = typeof sess.score === "number" ? sess.score : null;
        testDate = sess.submitted_at ?? null;
      }
    }

    return NextResponse.json(
      {
        ok: true,
        trackId,
        day,
        dayComplete,
        testTaken,
        score,
        testDate,
        skipLearningCheck,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("test/eligibility error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
