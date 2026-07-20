import { round2 } from "@/lib/reading-review/core/metrics";
import type { SessionAnalysisResult } from "@/lib/reading-review/core/types";
import type { NaesinSessionRef } from "@/lib/reading-review/adapters/naesin/session";

type SupabaseServerClient = Awaited<
  ReturnType<typeof import("@/lib/supabase/server").getServerSupabase>
>;

type ActionOk<T extends object = {}> = { ok: true } & T;
type ActionFail = { ok: false; error: string };

export async function saveNaesinSessionAnalysisSnapshot(
  supabase: SupabaseServerClient,
  input: {
    sessionId: string;
    session: NaesinSessionRef;
    analysis: SessionAnalysisResult;
  },
): Promise<ActionOk | ActionFail> {
  const { sessionId, session, analysis } = input;

  const {
    accuracyOverall,
    byQuestionType,
    byPassage,
    evidenceMetrics,
    vocabMetrics,
    sentenceMetrics,
    behaviorMetrics,
    weakTags,
    prescriptions,
  } = analysis;

  const { error: snapshotError } = await supabase
    .from("naesin_reading_session_analysis_snapshots")
    .upsert(
      {
        session_id: sessionId,
        student_id: session.student_id,
        set_id: session.set_id,
        accuracy_overall: accuracyOverall,
        score_percent:
          typeof session.score_percent === "number"
            ? round2(session.score_percent)
            : round2(accuracyOverall),
        by_question_type: byQuestionType,
        by_passage: byPassage,
        evidence_metrics: evidenceMetrics,
        vocab_metrics: vocabMetrics,
        sentence_metrics: sentenceMetrics,
        behavior_metrics: behaviorMetrics,
        weak_tags: weakTags,
        prescriptions,
      },
      { onConflict: "session_id" },
    );

  if (snapshotError) return { ok: false, error: snapshotError.message };

  const { error: sessionUpdateError } = await supabase
    .from("naesin_reading_sessions")
    .update({
      analytics_snapshot: {
        accuracyOverall,
        weakTags,
        prescriptions,
        evidenceMetrics,
        vocabMetrics,
        sentenceMetrics,
        behaviorMetrics,
      },
    })
    .eq("id", sessionId);

  if (sessionUpdateError) {
    return { ok: false, error: sessionUpdateError.message };
  }

  return { ok: true };
}
