// apps/web/app/api/updated-reading/result/route.ts
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

type AnswerPayload = {
  questionId: string;
  number: number;
  chosenChoiceId: string | null;
};

type Body = {
  testId: string;
  totalQuestions: number;
  answers: AnswerPayload[];
  finishedAt: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    // 🔍 1차 검증
    if (
      !body ||
      typeof body.testId !== "string" ||
      !Number.isFinite(body.totalQuestions) ||
      !Array.isArray(body.answers)
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid payload" },
        { status: 400 }
      );
    }

    const supabase = await getServerSupabase();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("updated-reading result – getUser error", userError);
    }

    // ✅ DB insert
    const { data, error } = await supabase
      .from("reading_results_2026")
      .insert({
        test_id: body.testId,
        user_id: user?.id ?? null,
        total_questions: body.totalQuestions,
        // 여기 컬럼명이 answers(jsonb)라고 가정
        answers: body.answers,
        finished_at: body.finishedAt || new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      console.error("updated-reading result – insert error", error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, id: data.id });
  } catch (e: any) {
    console.error("updated-reading result – unexpected error", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
