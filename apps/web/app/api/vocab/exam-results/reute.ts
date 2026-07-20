// apps/web/app/api/vocab/exam-results/route.ts
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

type ExamSavePayload = {
  totalQuestions: number;
  correctAuto: number;
  rateAuto: number;
  // 그대로 raw_answers에 넣을 구조
  raw: {
    answers: any[];
    questions: { id: string; type: string }[];
  };
  mode?: string | null;
  gradeBand?: string | null;
};

export async function POST(req: Request) {
  const supabase = await getServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let payload: ExamSavePayload;

  try {
    payload = (await req.json()) as ExamSavePayload;
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const {
    totalQuestions,
    correctAuto,
    rateAuto,
    raw,
    mode = "core",
    gradeBand = null,
  } = payload;

  // 간단한 방어 로직
  if (!totalQuestions || totalQuestions <= 0) {
    return NextResponse.json(
      { ok: false, error: "totalQuestions is required" },
      { status: 400 },
    );
  }

  const { error } = await supabase.from("vocab_exam_results").insert({
    user_id: user?.id ?? null,
    mode,
    grade_band: gradeBand,
    total_questions: totalQuestions,
    correct_auto: correctAuto,
    rate_auto: rateAuto,
    raw_answers: raw,
  });

  if (error) {
    console.error("Failed to insert vocab_exam_results", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
