import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { testId, answers } = await req.json();
    if (!testId || !answers) return NextResponse.json({ error: "testId and answers required" }, { status: 400 });

    const { data, error } = await supabase
      .from("writing_2026_sessions")
      .insert({ user_id: user.id, test_id: testId, raw_answers: answers, status: "completed" })
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json({ sessionId: data.id });
  } catch (err) {
    console.error("writing save-session error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
