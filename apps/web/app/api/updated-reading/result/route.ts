// apps/web/app/api/updated-reading/result/route.ts
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";

type AnswerPayload = {
  questionId: string;
  chosenChoiceId: string | string[] | null;
};

type Body = {
  testId: string;
  assignmentId?: string;
  isAdaptive?: boolean;
  stage2Difficulty?: "easy" | "hard";
  answers: AnswerPayload[];
  finishedAt: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    if (!body || typeof body.testId !== "string" || !Array.isArray(body.answers)) {
      return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
    }

    const supabase = await getServerSupabase();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("updated-reading result – getUser error", userError);
    }

    const { data, error } = await supabase
      .from("reading_results_2026")
      .insert({
        test_id: body.testId,
        assignment_id: body.assignmentId ?? null,
        user_id: user?.id ?? null,
        total_questions: body.answers.length,
        is_adaptive: body.isAdaptive ?? false,
        stage2_difficulty: body.stage2Difficulty ?? null,
        // 컬럼명은 answers다. raw_result로 쓰고 있어서 삽입이 매번 실패했고,
        // 그래서 reading_results_2026이 계속 비어 있었다.
        answers: body.answers,
        finished_at: body.finishedAt || new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      console.error("updated-reading result – insert error", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (body.assignmentId) {
      const service = getServiceSupabase();
      await service
        .from("test_assignments")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", body.assignmentId);
    }

    return NextResponse.json({ ok: true, id: data.id });
  } catch (e: any) {
    console.error("updated-reading result – unexpected error", e);
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
