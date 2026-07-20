import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { awardPoints } from "@/lib/gamification/awardPoints";

export async function POST(req: Request) {
  try {
    const { unit_id } = await req.json();
    const supabase = await getServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await supabase.from("grammar_2026_unit_completions").upsert(
      { student_id: user.id, unit_id },
      { onConflict: "student_id,unit_id" }
    );

    void awardPoints({ studentId: user.id, ruleId: 'grammar_unit', sourceRef: unit_id });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
