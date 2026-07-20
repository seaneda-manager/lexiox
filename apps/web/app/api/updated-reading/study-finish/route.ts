// apps/web/app/api/updated-reading/save-result/route.ts
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { awardPoints } from "@/lib/gamification/awardPoints";

type SaveBody = {
  testId: string;
  testLabel?: string | null;
  totalQuestions: number;
  answers: Record<string, unknown>;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SaveBody | null;

    if (!body) {
      return NextResponse.json(
        { ok: false, error: "Missing request body" },
        { status: 400 }
      );
    }

    const { testId, testLabel, totalQuestions, answers } = body;

    if (!testId) {
      return NextResponse.json(
        { ok: false, error: "Missing testId" },
        { status: 400 }
      );
    }

    if (!answers || typeof answers !== "object") {
      return NextResponse.json(
        { ok: false, error: "Missing answers" },
        { status: 400 }
      );
    }

    const supabase = await getServerSupabase();

    // 🔐 현재 로그인된 사용자
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr) {
      console.error("updated-reading/save-result getUser error", userErr);
      return NextResponse.json(
        { ok: false, error: userErr.message },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    // TODO: 나중에 채점 로직 넣고 correct_count 계산 가능
    const correctCount = 0;

    const { error: insertErr } = await supabase
      .from("reading_results_2026")
      .insert({
        user_id: user.id,
        test_id: testId,
        test_label: testLabel ?? null,
        total_questions: totalQuestions,
        correct_count: correctCount,
        answers, // jsonb 컬럼
      });

    if (insertErr) {
      console.error("reading_results_2026 insert error", insertErr);
      return NextResponse.json(
        { ok: false, error: insertErr.message },
        { status: 500 }
      );
    }

    void awardPoints({ studentId: user.id, ruleId: 'reading_session', sourceRef: testId });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("updated-reading/save-result handler error", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown server error" },
      { status: 500 }
    );
  }
}
