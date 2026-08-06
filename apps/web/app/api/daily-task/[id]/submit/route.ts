export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSupabase, getServiceRoleClient } from "@/lib/supabase/server";
import { fetchAndFormatDailyTaskProblems } from "@/lib/utils/dailyTaskFormat";
import { recordProblemSolution } from "@/lib/utils/problemBank";

/**
 * POST /api/daily-task/[id]/submit
 * 학생이 Daily Task 답안을 제출 → 채점 → daily_tests에 저장
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { answers } = (await req.json()) as { answers?: Record<string, string | null> };
    if (!answers || typeof answers !== "object") {
      return NextResponse.json({ error: "answers is required" }, { status: 400 });
    }

    const { data: task, error: taskError } = await supabase
      .from("daily_tests")
      .select("*")
      .eq("id", id)
      .eq("student_id", user.id)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (task.status === "completed") {
      return NextResponse.json({ error: "이미 제출된 과제입니다." }, { status: 400 });
    }

    const { complete_words, daily_life, academic_passage } = await fetchAndFormatDailyTaskProblems(
      supabase,
      task
    );

    // 채점
    let correctCount = 0;
    let totalCount = 0;
    const perItemResults: Array<{ problemType: "complete_words" | "daily_life" | "academic_passage"; problemId: string; isCorrect: boolean }> = [];

    for (const item of complete_words) {
      let itemCorrect = 0;
      const itemTotal = item.blanks.length;
      for (const blank of item.blanks) {
        const key = `cw__${item.id}__${blank.id}`;
        const typed = (answers[key] ?? "").toString().trim().toLowerCase();
        const isRight = typed.length > 0 && typed === (blank.correctToken ?? "").toString().trim().toLowerCase();
        if (isRight) {
          correctCount++;
          itemCorrect++;
        }
        totalCount++;
      }
      perItemResults.push({
        problemType: "complete_words",
        problemId: item.id,
        isCorrect: itemTotal > 0 && itemCorrect / itemTotal >= 0.7,
      });
    }

    for (const item of [...daily_life, ...academic_passage]) {
      let itemCorrect = 0;
      const itemTotal = item.questions.length;
      for (const q of item.questions) {
        const chosen = answers[q.id] ?? null;
        const correctChoice = q.choices.find((c: any) => c.is_correct);
        const isRight = chosen != null && correctChoice != null && chosen === correctChoice.id;
        if (isRight) {
          correctCount++;
          itemCorrect++;
        }
        totalCount++;
      }
      perItemResults.push({
        problemType: item.type,
        problemId: item.id,
        isCorrect: itemTotal > 0 && itemCorrect / itemTotal >= 0.7,
      });
    }

    // daily_tests.total_score는 INT 컬럼 → 0~100 백분율 정수로 저장
    const totalScore = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

    // RLS: 학생은 자신의 daily_tests row에 UPDATE 권한이 없으므로 service role로 갱신
    const admin = getServiceRoleClient();
    const { error: updateError } = await admin
      .from("daily_tests")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        answers,
        total_score: totalScore,
      })
      .eq("id", id);

    if (updateError) {
      console.error("[daily-task submit] update error:", updateError);
      return NextResponse.json({ error: "Failed to save submission" }, { status: 500 });
    }

    // Topic 재출제 방지 트래킹 (기존 헬퍼 재사용, 실패해도 제출 자체는 성공 처리)
    void Promise.all(
      perItemResults.map((r) =>
        recordProblemSolution(user.id, r.problemType, r.problemId, r.isCorrect, id).catch((err) =>
          console.error("[daily-task submit] recordProblemSolution failed:", err)
        )
      )
    );

    return NextResponse.json({ ok: true, correctCount, totalCount, totalScore });
  } catch (err: any) {
    console.error("[daily-task submit] ERROR:", err);
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
