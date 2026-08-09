export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { resultId, questionId, note } = await req.json();
    if (!resultId || !questionId) {
      return NextResponse.json({ ok: false, error: "resultId and questionId required" }, { status: 400 });
    }

    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const { data: existing, error: fetchErr } = await supabase
      .from("listening_results_2026")
      .select("review_notes")
      .eq("id", resultId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchErr || !existing) {
      return NextResponse.json({ ok: false, error: "Result not found" }, { status: 404 });
    }

    const updatedNotes = { ...(existing.review_notes ?? {}), [questionId]: note };

    const { error: updateErr } = await supabase
      .from("listening_results_2026")
      .update({ review_notes: updatedNotes })
      .eq("id", resultId)
      .eq("user_id", user.id);

    if (updateErr) {
      console.error("[listening/review/notes] update error:", updateErr);
      return NextResponse.json({ ok: false, error: "Failed to save note" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[listening/review/notes] error:", err);
    return NextResponse.json({ ok: false, error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
