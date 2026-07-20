import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      drill_id, answer_correct, label_correct,
      selected_answer, selected_label_id, accordion_opened,
    } = body;

    const supabase = await getServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase.from("grammar_2026_student_responses").insert({
      student_id: user.id,
      drill_id,
      answer_correct,
      label_correct: label_correct ?? null,
      selected_answer: selected_answer ?? null,
      selected_label_id: selected_label_id ?? null,
      accordion_opened: accordion_opened ?? false,
    });

    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
