import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      question_id,
      test_id,
      question_interpretation,
      evidence_interpretation,
      correct_choice_explanation,
      incorrect_choices,
      vocabulary_notes,
    } = body;

    if (!question_id || !test_id) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = await getServerSupabase();

    const { error } = await supabase
      .from("reading_question_explanations")
      .insert({
        question_id,
        test_id,
        question_interpretation: question_interpretation || null,
        evidence_interpretation: evidence_interpretation || null,
        correct_choice_explanation: correct_choice_explanation || null,
        incorrect_choices: incorrect_choices || null,
        vocabulary_notes: vocabulary_notes || null,
      });

    if (error) {
      console.error("[explanation/new] insert error:", error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[explanation/new] error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
