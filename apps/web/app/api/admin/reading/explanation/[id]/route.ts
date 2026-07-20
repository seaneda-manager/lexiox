import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const supabase = await getServerSupabase();

    const { error } = await supabase
      .from("reading_question_explanations")
      .update({
        question_interpretation: body.question_interpretation,
        evidence_interpretation: body.evidence_interpretation,
        correct_choice_explanation: body.correct_choice_explanation,
        incorrect_choices: body.incorrect_choices,
        vocabulary_notes: body.vocabulary_notes,
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[admin/reading/explanation/[id]] error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
