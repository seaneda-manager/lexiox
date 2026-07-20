"use server";

import { getServiceSupabase } from "@/lib/supabase/service";

export async function updateGrammarSessionProgressAction(
  sessionId: string,
  progress: {
    stage: string;
  }
) {
  try {
    const supabase = getServiceSupabase();
    await supabase
      .from("jr_grammar_sessions")
      .update({
        stage: progress.stage,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);
    return { ok: true };
  } catch (e: any) {
    console.error("Failed to update grammar session progress:", e);
    return { ok: false, error: e?.message };
  }
}

export async function completeGrammarSessionAction(sessionId: string) {
  try {
    const supabase = getServiceSupabase();
    await supabase
      .from("jr_grammar_sessions")
      .update({
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);
    return { ok: true };
  } catch (e: any) {
    console.error("Failed to complete grammar session:", e);
    return { ok: false, error: e?.message };
  }
}

export async function saveLessonLogAction(
  sessionId: string,
  log: {
    explanationText: string;
    fillInAnswer: string;
    understood: boolean;
  }
) {
  try {
    const supabase = getServiceSupabase();
    await supabase
      .from("jr_grammar_lesson_logs")
      .insert([
        {
          session_id: sessionId,
          explanation_text: log.explanationText,
          fill_in_answer: log.fillInAnswer,
          understood: log.understood,
          completed_at: new Date().toISOString(),
        },
      ]);
    return { ok: true };
  } catch (e: any) {
    console.error("Failed to save lesson log:", e);
    return { ok: false, error: e?.message };
  }
}

export async function savePracticeLogAction(
  sessionId: string,
  log: {
    problemId: string;
    studentAnswer: string;
    isCorrect: boolean;
    points: number;
    hintUsed: boolean;
  }
) {
  try {
    const supabase = getServiceSupabase();
    await supabase
      .from("jr_grammar_practice_logs")
      .insert([
        {
          session_id: sessionId,
          problem_id: log.problemId,
          student_answer: log.studentAnswer,
          is_correct: log.isCorrect,
          points: log.points,
          hint_used: log.hintUsed,
          attempted_at: new Date().toISOString(),
        },
      ]);
    return { ok: true };
  } catch (e: any) {
    console.error("Failed to save practice log:", e);
    return { ok: false, error: e?.message };
  }
}
