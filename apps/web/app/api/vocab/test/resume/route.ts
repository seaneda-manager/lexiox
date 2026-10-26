export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

// 새로고침/끊김 후 이어하기: 같은 Day 에서 아직 끝내지 않은 최근 시험 세션과 문제를 돌려준다.
const RESUME_WINDOW_MS = 3 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
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

    const trackId = req.nextUrl.searchParams.get("track_id");
    const day = Number(req.nextUrl.searchParams.get("day"));
    const wrongOnly = req.nextUrl.searchParams.get("wrong_only") === "true";
    if (!trackId || !Number.isFinite(day)) return NextResponse.json({ session: null });

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const since = new Date(Date.now() - RESUME_WINDOW_MS).toISOString();
    const { data: session } = await admin
      .from("vocab_test_sessions")
      .select("*")
      .eq("student_id", user.id)
      .eq("track_id", trackId)
      .eq("day_number", day)
      .eq("status", "in_progress")
      .eq("use_wrong_only", wrongOnly)
      .gte("started_at", since)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!session) return NextResponse.json({ session: null });

    const { data: questions } = await admin
      .from("vocab_test_questions")
      .select("*")
      .eq("session_id", session.id)
      .order("question_number", { ascending: true });
    if (!questions || questions.length === 0) return NextResponse.json({ session: null });

    return NextResponse.json({
      session_id: session.id,
      questions: questions.map((q: any) => ({ ...q, hint_level: q.hint_level ?? 0, streak_bonus: q.streak_bonus ?? 0 })),
      current_streak: session.current_streak ?? 0,
      best_streak: session.best_streak ?? 0,
      total_points: session.total_points ?? 0,
    });
  } catch (e) {
    console.error("Test resume error:", e);
    return NextResponse.json({ session: null });
  }
}
