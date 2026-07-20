import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { sessionId, key, value } = await req.json();
    if (!sessionId || !key) return NextResponse.json({ error: "sessionId and key required" }, { status: 400 });

    const { data: session, error: fetchErr } = await supabase
      .from("writing_2026_sessions")
      .select("id, user_id, raw_answers")
      .eq("id", sessionId)
      .maybeSingle();

    if (fetchErr || !session) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (session.user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const updated = { ...(session.raw_answers as Record<string, string>), [key]: value };

    const { error } = await supabase
      .from("writing_2026_sessions")
      .update({ raw_answers: updated })
      .eq("id", sessionId);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("writing update-answer error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
