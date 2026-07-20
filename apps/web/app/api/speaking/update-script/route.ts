import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { resultId, script } = await req.json();
    if (!resultId) return NextResponse.json({ error: "resultId required" }, { status: 400 });
    if (typeof script !== "string") return NextResponse.json({ error: "script required" }, { status: 400 });

    const { data: existing, error: fetchErr } = await supabase
      .from("speaking_results_2026")
      .select("id, user_id")
      .eq("id", resultId)
      .maybeSingle();

    if (fetchErr || !existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { error } = await supabase
      .from("speaking_results_2026")
      .update({ script: script.trim() })
      .eq("id", resultId);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("update-script error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
