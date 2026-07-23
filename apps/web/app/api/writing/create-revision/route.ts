import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { sessionId } = await req.json();
    if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

    // 원본 session 조회
    const { data: originalSession, error: fetchError } = await supabase
      .from("writing_2026_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError || !originalSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // 새로운 revision session 생성
    const { data: newSession, error: insertError } = await supabase
      .from("writing_2026_sessions")
      .insert({
        user_id: user.id,
        test_id: originalSession.test_id,
        parent_session_id: sessionId,
        // 초기 답변은 원본과 동일하게 시작
        raw_answers: originalSession.raw_answers,
        status: "in_progress",
      })
      .select("id")
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({
      revisionSessionId: newSession.id,
      parentSessionId: sessionId,
    });
  } catch (err) {
    console.error("create-revision error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
