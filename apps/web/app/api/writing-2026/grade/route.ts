// app/api/writing-2026/grade/route.ts
// AI 채점 엔드포인트 — ETS 방식(0~5 홀리스틱 + 기준별 근거 + 이중 채점). 선생님/관리자 전용.
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { requireTeacherOrAdmin } from "@/lib/auth/requireTeacherOrAdmin";
import { gradeWriting } from "@/lib/writing/aiGrader";
import { calcWritingRawScore, type EtsWritingScore } from "@/lib/writing/rubric";
import type { WritingGradeDetail } from "@/lib/writing/gradeDetail";
import type { WWritingTest2026 } from "@/models/writing";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function textOf(v: unknown): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && "content" in v) return String((v as any).content ?? "");
  return "";
}

/** 학생 총평(한국어)을 상세 결과에서 만든다. 선생님이 고쳐 쓰는 초안이다. */
function composeFeedback(d: WritingGradeDetail): string {
  const lines: string[] = [];
  if (d.email) lines.push(`[Email ${d.email.holistic}/5] ${d.email.summary}`);
  if (d.discussion) lines.push(`[Academic Discussion ${d.discussion.holistic}/5] ${d.discussion.summary}`);
  const steps = [...(d.email?.nextSteps ?? []).slice(0, 2), ...(d.discussion?.nextSteps ?? []).slice(0, 2)];
  if (steps.length) lines.push(`다음 단계: ${steps.join(" / ")}`);
  return lines.join("\n");
}

export async function POST(req: Request) {
  try {
    await requireTeacherOrAdmin();
  } catch (e) {
    const m = e instanceof Error ? e.message : "";
    const status = m.startsWith("401") ? 401 : m.startsWith("403") ? 403 : 500;
    return NextResponse.json({ ok: false, error: status === 500 ? "auth check failed" : m }, { status });
  }

  const supabase = await getServerSupabase();

  let sessionId: string;
  try {
    ({ sessionId } = (await req.json()) as { sessionId: string });
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (!sessionId) {
    return NextResponse.json({ ok: false, error: "sessionId required" }, { status: 400 });
  }

  const { data: session, error: fetchErr } = await supabase
    .from("writing_2026_sessions")
    .select("id, test_id, raw_answers, grading_status")
    .eq("id", sessionId)
    .maybeSingle();
  if (fetchErr || !session) {
    return NextResponse.json({ ok: false, error: "Session not found" }, { status: 404 });
  }

  const answers = (session.raw_answers ?? {}) as Record<string, any>;
  const emailText = textOf(answers.task_2_submission);
  const discussionText = textOf(answers.task_3_submission);
  if (!emailText.trim() && !discussionText.trim()) {
    return NextResponse.json({ ok: false, error: "No answers to grade" }, { status: 422 });
  }

  // 과제 지시문 (채점기가 "과제를 다 다뤘는지" 판단하려면 필수)
  let emailPrompt = "";
  let discussionPrompt = "";
  const { data: testRow } = await supabase
    .from("writing_tests")
    .select("payload")
    .eq("id", session.test_id)
    .maybeSingle();
  if (testRow?.payload) {
    const test = testRow.payload as WWritingTest2026;
    for (const item of test.items ?? []) {
      if (item.taskKind === "email") {
        emailPrompt = [
          `Situation: ${item.situation}`,
          `Task: ${item.prompt}`,
          item.hints?.length ? `Points to address: ${item.hints.join("; ")}` : "",
        ].filter(Boolean).join("\n");
      } else if (item.taskKind === "academic_discussion") {
        discussionPrompt = [
          `Context: ${item.context}`,
          `Professor: ${item.professorPrompt}`,
          ...(item.studentPosts ?? []).map((p) => `${p.author}: ${p.content}`),
        ].join("\n");
      }
    }
  }

  try {
    const detail = await gradeWriting({ emailPrompt, discussionPrompt, emailText, discussionText });

    const buildASentence = Number(answers.task_1_score_raw ?? 0);
    const email = (detail.email?.holistic ?? 0) as EtsWritingScore;
    const discussion = (detail.discussion?.holistic ?? 0) as EtsWritingScore;
    const totalScore = calcWritingRawScore({ buildASentence, email, discussion });
    const feedback = composeFeedback(detail);

    const base = {
      ai_build_a_sentence_score: buildASentence,
      ai_email_score: email,
      ai_discussion_score: discussion,
      ai_total_score: totalScore,
      ai_grade_feedback: feedback,
      ai_graded_at: new Date().toISOString(),
      grading_status: "ai_graded",
    };

    // 상세 결과는 ai_grade_detail(jsonb)에 저장한다. 마이그레이션 전이라 컬럼이 없으면
    // 점수·총평만이라도 저장해 채점 흐름이 끊기지 않게 한다.
    let detailSaved = true;
    let { error: updateErr } = await supabase
      .from("writing_2026_sessions")
      .update({ ...base, ai_grade_detail: detail })
      .eq("id", sessionId);
    if (updateErr && /ai_grade_detail/i.test(updateErr.message)) {
      detailSaved = false;
      ({ error: updateErr } = await supabase.from("writing_2026_sessions").update(base).eq("id", sessionId));
    }
    if (updateErr) {
      console.error("[Writing Grade] DB update error:", updateErr);
      return NextResponse.json({ ok: false, error: `DB update failed: ${updateErr.message}` }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      detailSaved,
      grading: { scores: { buildASentence, email, discussion }, feedback },
      detail,
    });
  } catch (err) {
    console.error("[Writing Grade] Error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: `AI grading failed: ${msg}` }, { status: 500 });
  }
}
