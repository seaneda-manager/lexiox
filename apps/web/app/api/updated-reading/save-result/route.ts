// apps/web/app/api/updated-reading/save-result/route.ts
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

type SaveBody = {
  testId?: string;
  totalQuestions?: number;
  answers?: Record<string, unknown>;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as SaveBody | null;

    console.log("[updated-reading/save-result] body:", body);

    if (!body?.testId || !body.answers) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields (testId, answers)" },
        { status: 400 },
      );
    }

    const supabase = await getServerSupabase();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const totalQuestions =
      body.totalQuestions ?? Object.keys(body.answers).length;

    const { data, error } = await supabase
      .from("reading_results_2026")
      .insert({
        // 스키마: id / test_id / user_id / total_questions / answers / finished_at / created_at
        test_id: body.testId,
        user_id: user?.id ?? null,
        total_questions: totalQuestions,
        answers: body.answers,
        // finished_at / created_at 은 DB default 사용
      })
      .select("id")
      .single();

    if (error) {
      console.error(
        "[updated-reading/save-result] insert error:",
        error.message,
      );
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, resultId: data.id });
  } catch (err: any) {
    console.error("[updated-reading/save-result] uncaught:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown server error" },
      { status: 500 },
    );
  }
}
